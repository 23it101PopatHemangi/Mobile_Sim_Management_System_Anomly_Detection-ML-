#!/usr/bin/env python3
"""
ML API endpoints for SIM Anomaly Detection
Flask API to serve the ML model predictions
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import pandas as pd
import json
import os
from datetime import datetime
from ml_service import SIManomalyDetector
import joblib

app = Flask(__name__)
CORS(app)

# Global detector instance
detector = SIManomalyDetector()

# Load model on startup (supports multiple artifact formats & locations)
if detector.load_model():
    print("Model loaded on startup")
else:
    print("No pre-trained model found via loader. You can upload a training file at /api/ml/train or rely on auto-train in __main__.")

@app.route('/api/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': detector.is_trained,
        'timestamp': datetime.now().isoformat()
    })

# Friendly index route to avoid 404 when hitting '/'
@app.route('/', methods=['GET'])
def index():
    return Response(
        "SIM ML API is running. Try /api/ml/health, /api/ml/predict, /api/ml/batch-predict, /api/ml/upload-artifact",
        mimetype='text/plain'
    )

# Prevent 404 noise from favicon
@app.route('/favicon.ico')
def favicon():
    return ('', 204)

@app.route('/api/ml/upload-artifact', methods=['POST'])
def upload_artifact():
    """Upload a pre-trained joblib artifact and load it immediately.
    Expect: multipart/form-data with field 'artifact' (.joblib file)
    """
    try:
        if 'artifact' not in request.files:
            return jsonify({'error': 'No artifact file provided'}), 400
        file = request.files['artifact']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        os.makedirs('models', exist_ok=True)
        save_path = os.path.join('models', 'isoforest_sim_pipeline.joblib')
        file.save(save_path)

        # Try to load immediately
        if detector.load_model():
            return jsonify({'message': 'Artifact uploaded and model loaded', 'model_loaded': True})
        else:
            return jsonify({'error': 'Uploaded, but failed to load model. Ensure it contains model, preprocessor, feature_names.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/train', methods=['POST'])
def train_model():
    """Train the ML model with uploaded data"""
    try:
        # Check if file is uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file temporarily
        temp_path = f"temp_{file.filename}"
        file.save(temp_path)
        
        # Load and train model
        df = detector.load_data(temp_path)
        if df is None:
            os.remove(temp_path)
            return jsonify({'error': 'Failed to load data'}), 400
        
        # Get contamination parameter
        contamination = float(request.form.get('contamination', 0.05))
        
        # Train model
        success = detector.train_model(df, contamination=contamination)
        
        if success:
            # Save model
            detector.save_model()
            
            # Clean up
            os.remove(temp_path)
            
            return jsonify({
                'message': 'Model trained successfully',
                'data_shape': df.shape,
                'contamination': contamination,
                'timestamp': datetime.now().isoformat()
            })
        else:
            os.remove(temp_path)
            return jsonify({'error': 'Failed to train model'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/predict', methods=['POST'])
def predict_anomalies():
    """Predict anomalies for uploaded data"""
    try:
        if not detector.is_trained:
            return jsonify({'error': 'Model not trained'}), 400
        
        # Handle JSON data
        if request.is_json:
            data = request.get_json()
            df = pd.DataFrame(data)
        
        # Handle file upload
        elif 'file' in request.files:
            file = request.files['file']
            temp_path = f"temp_predict_{file.filename}"
            file.save(temp_path)
            
            df = detector.load_data(temp_path)
            os.remove(temp_path)
            
            if df is None:
                return jsonify({'error': 'Failed to load data'}), 400
        
        else:
            return jsonify({'error': 'No data provided'}), 400
        
        # Predict anomalies
        results = detector.predict_anomalies(df)
        
        # Save results to JSON file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"anomaly_results_{timestamp}.json"
        
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Calculate statistics
        total_records = len(results)
        anomaly_count = sum(1 for r in results if r['is_anomaly'])
        anomaly_percentage = (anomaly_count / total_records) * 100 if total_records > 0 else 0
        
        return jsonify({
            'results': results,
            'statistics': {
                'total_records': total_records,
                'anomaly_count': anomaly_count,
                'anomaly_percentage': round(anomaly_percentage, 2),
                'normal_count': total_records - anomaly_count
            },
            'output_file': output_file,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/batch-predict', methods=['POST'])
def batch_predict():
    """Batch prediction for multiple SIM records"""
    try:
        if not detector.is_trained:
            return jsonify({'error': 'Model not trained'}), 400
        
        data = request.get_json()
        if not data or 'records' not in data:
            return jsonify({'error': 'No records provided'}), 400
        
        # Convert to DataFrame
        df = pd.DataFrame(data['records'])

        # Predict anomalies with optional contamination override
        contamination = data.get('contamination', None)
        if contamination is not None:
            try:
                c = float(contamination)
            except Exception:
                c = None
        else:
            c = None

        if c is None or c <= 0 or c >= 0.5:
            # Normal prediction path
            results = detector.predict_anomalies(df)
        else:
            # Compute scores and apply custom threshold so ~c fraction are anomalies
            df_prepared = detector._ensure_prediction_features(df)
            feature_data = df_prepared[detector.feature_names].copy()
            numeric_cols = feature_data.select_dtypes(include=['number']).columns
            categorical_cols = feature_data.select_dtypes(include=['object']).columns
            for col in numeric_cols:
                feature_data[col] = feature_data[col].fillna(feature_data[col].median())
            for col in categorical_cols:
                feature_data[col] = feature_data[col].fillna('Unknown')

            X_transformed = detector.preprocessor.transform(feature_data)
            scores = detector.model.decision_function(X_transformed)
            import numpy as np
            thresh = np.quantile(scores, c)
            is_anom = scores <= thresh
            # Build results similar to detector.predict_anomalies
            results = []
            for idx in range(len(df_prepared)):
                row = df_prepared.iloc[idx]
                result = {
                    'sim_id': str(row.get('sim_id', f'SIM_{idx}') or ''),
                    'customer_id': str(row.get('customer_id', '') or ''),
                    'phone_no': str(row.get('Phone no', '') or ''),
                    'operator': str(row.get('operator', '') or ''),
                    'status': str(row.get('status', '') or ''),
                    'anomaly_score': float(scores[idx]),
                    'is_anomaly': bool(is_anom[idx]),
                    'timestamp': datetime.now().isoformat(),
                    'confidence': abs(float(scores[idx]))
                }
                results.append(result)
        
        # Filter only anomalies if requested
        if data.get('anomalies_only', False):
            results = [r for r in results if r['is_anomaly']]
        
        return jsonify({
            'results': results,
            'total_processed': len(df),
            'anomalies_found': len([r for r in results if r['is_anomaly']]),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/model-info', methods=['GET'])
def model_info():
    """Get information about the current model"""
    try:
        if not detector.is_trained:
            return jsonify({'error': 'Model not trained'}), 400
        
        return jsonify({
            'model_type': 'Isolation Forest',
            'features': detector.feature_names,
            'n_features': len(detector.feature_names) if detector.feature_names else 0,
            'model_params': {
                'n_estimators': detector.model.n_estimators,
                'contamination': detector.model.contamination,
                'max_samples': detector.model.max_samples
            } if detector.model else {},
            'is_trained': detector.is_trained,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/retrain', methods=['POST'])
def retrain_model():
    """Retrain model with new parameters"""
    try:
        data = request.get_json()
        contamination = data.get('contamination', 0.05)
        
        # Load existing dataset
        data_path = '../sim_dataset_with_phone_features.xlsx'
        df = detector.load_data(data_path)
        
        if df is None:
            return jsonify({'error': 'Failed to load training data'}), 400
        
        # Retrain model
        success = detector.train_model(df, contamination=contamination)
        
        if success:
            detector.save_model()
            return jsonify({
                'message': 'Model retrained successfully',
                'contamination': contamination,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to retrain model'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create models directory
    os.makedirs('models', exist_ok=True)
    
    # Train model if not exists
    if not os.path.exists('models/isolation_forest_model.pkl'):
        print("Training initial model...")
        from ml_service import train_and_save_model
        train_and_save_model()
        detector.load_model()
    
    app.run(host='0.0.0.0', port=5001, debug=False)
