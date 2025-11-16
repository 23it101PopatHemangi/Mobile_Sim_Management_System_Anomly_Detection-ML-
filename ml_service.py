#!/usr/bin/env python3
"""
ML Service for SIM Anomaly Detection
Isolation Forest based anomaly detection for SIM management system
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

class SIManomalyDetector:
    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.feature_names = None
        self.is_trained = False
        
    def _ensure_prediction_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Ensure engineered features exist at prediction time to match training."""
        df = df.copy()
        # phone_prefix from 'Phone no' (fallback to empty prefix if missing)
        if 'phone_prefix' not in df.columns:
            if 'Phone no' in df.columns:
                df['phone_prefix'] = df['Phone no'].astype(str).str[:3]
            else:
                df['phone_prefix'] = ''
        # is_company_number from 'registered_company' (fallback to 0 if missing)
        if 'is_company_number' not in df.columns:
            if 'registered_company' in df.columns:
                df['is_company_number'] = df['registered_company'].notna().astype(int)
            else:
                df['is_company_number'] = 0
        return df
        
    def load_data(self, file_path):
        """Load SIM dataset"""
        try:
            if file_path.endswith('.xlsx'):
                df = pd.read_excel(file_path)
            else:
                df = pd.read_csv(file_path)
            print(f"Loaded dataset with shape: {df.shape}")
            return df
        except Exception as e:
            print(f"Error loading data: {e}")
    
    def preprocess_data(self, df):
        """Preprocess the SIM data for anomaly detection"""
        # Define features based on the notebook analysis
        numeric_features = [
            'call_count_outgoing', 'call_count_incoming', 'avg_call_duration',
            'sms_count_sent', 'sms_count_received', 'avg_daily_usage', 'usage_variance',
            'is_company_number'
        ]
        
        categorical_features = [
            'status', 'registered_location', 'current_location', 'operator', 'phone_prefix'
        ]
        
        # Create phone prefix feature if phone number exists
        if 'Phone no' in df.columns:
            df['phone_prefix'] = df['Phone no'].astype(str).str[:3]
        
        # Select available features
        available_numeric = [f for f in numeric_features if f in df.columns]
        available_categorical = [f for f in categorical_features if f in df.columns]
        
        # Create preprocessor
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), available_numeric),
                ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), available_categorical)
            ]
        )
        
        # Combine features
        feature_data = df[available_numeric + available_categorical].copy()
        
        # Handle missing values
        for col in available_numeric:
            feature_data[col] = feature_data[col].fillna(feature_data[col].median())
        
        for col in available_categorical:
            feature_data[col] = feature_data[col].fillna('Unknown')
        
        self.feature_names = available_numeric + available_categorical
        return feature_data, preprocessor
    
    def train_model(self, df, contamination=0.05):
        """Train the Isolation Forest model"""
        try:
            # Preprocess data
            feature_data, preprocessor = self.preprocess_data(df)
            
            # Fit preprocessor and transform data
            X_transformed = preprocessor.fit_transform(feature_data)
            
            # Train Isolation Forest
            model = IsolationForest(
                n_estimators=200,
                max_samples='auto',
                contamination=contamination,
                random_state=42,
                n_jobs=-1
            )
            
            # If we have status column, train only on 'Active' records
            if 'status' in df.columns:
                active_mask = df['status'] == 'Active'
                if active_mask.sum() > 0:
                    # Use index positions to slice even if X_transformed is a sparse matrix
                    import numpy as _np
                    idx = _np.flatnonzero(active_mask.to_numpy())
                    X_active = X_transformed[idx]
                    model.fit(X_active)
                else:
                    model.fit(X_transformed)
            else:
                model.fit(X_transformed)
            
            self.model = model
            self.preprocessor = preprocessor
            self.is_trained = True
            
            print(f"Model trained successfully with {X_transformed.shape[1]} features")
            return True
            
        except Exception as e:
            print(f"Error training model: {e}")
            return False
    
    def predict_anomalies(self, df):
        """Predict anomalies for new data"""
        if not self.is_trained:
            raise ValueError("Model not trained. Call train_model() first.")
        
        try:
            # Ensure engineered features used during training are present
            df_prepared = self._ensure_prediction_features(df)
            
            # Preprocess new data
            feature_data = df_prepared[self.feature_names].copy()
            
            # Handle missing values
            numeric_cols = feature_data.select_dtypes(include=[np.number]).columns
            categorical_cols = feature_data.select_dtypes(include=['object']).columns
            
            for col in numeric_cols:
                feature_data[col] = feature_data[col].fillna(feature_data[col].median())
            
            for col in categorical_cols:
                feature_data[col] = feature_data[col].fillna('Unknown')
            
            # Transform data
            X_transformed = self.preprocessor.transform(feature_data)
            
            # Predict anomalies
            predictions = self.model.predict(X_transformed)
            anomaly_scores = self.model.decision_function(X_transformed)
            
            # Convert predictions (-1 = anomaly, 1 = normal) to boolean
            is_anomaly = predictions == -1
            
            # Create results
            results = []
            for idx in range(len(df_prepared)):
                row = df_prepared.iloc[idx]
                # Cast to JSON-safe native types
                sim_id = row.get('sim_id', f'SIM_{idx}')
                customer_id = row.get('customer_id', '')
                phone_no = row.get('Phone no', '')
                operator = row.get('operator', '')
                status = row.get('status', '')

                result = {
                    'sim_id': str(sim_id) if sim_id is not None else '',
                    'customer_id': str(customer_id) if customer_id is not None else '',
                    'phone_no': str(phone_no) if phone_no is not None else '',
                    'operator': str(operator) if operator is not None else '',
                    'status': str(status) if status is not None else '',
                    'anomaly_score': float(anomaly_scores[idx]),
                    'is_anomaly': bool(is_anomaly[idx]),
                    'timestamp': datetime.now().isoformat(),
                    'confidence': abs(float(anomaly_scores[idx]))
                }
                results.append(result)
            
            return results
            
        except Exception as e:
            print(f"Error predicting anomalies: {e}")
            return []
    
    def save_model(self, model_path='models/'):
        """Save trained model and preprocessor"""
        if not self.is_trained:
            raise ValueError("No trained model to save")
        
        os.makedirs(model_path, exist_ok=True)
        
        # Save model
        joblib.dump(self.model, os.path.join(model_path, 'isolation_forest_model.pkl'))
        joblib.dump(self.preprocessor, os.path.join(model_path, 'preprocessor.pkl'))
        
        # Save feature names
        with open(os.path.join(model_path, 'feature_names.json'), 'w') as f:
            json.dump(self.feature_names, f)
        
        # Save combined artifact compatible with notebook-style deployment
        combined_artifact = {
            'model': self.model,
            'preprocessor': self.preprocessor,
            'feature_names': self.feature_names
        }
        joblib.dump(combined_artifact, os.path.join(model_path, 'isoforest_sim_pipeline.joblib'))
        
        print(f"Model saved to {model_path}")
    
    def load_model(self, model_path='models/'):
        """Load trained model and preprocessor from multiple artifact formats."""
        # 1) Preferred: models/ directory artifacts
        try:
            model_fp = os.path.join(model_path, 'isolation_forest_model.pkl')
            prep_fp = os.path.join(model_path, 'preprocessor.pkl')
            feat_fp = os.path.join(model_path, 'feature_names.json')
            combo_fp = os.path.join(model_path, 'isoforest_sim_pipeline.joblib')

            if os.path.exists(combo_fp):
                artifact = joblib.load(combo_fp)
                self.model = artifact.get('model')
                self.preprocessor = artifact.get('preprocessor')
                self.feature_names = artifact.get('feature_names')
                if self.model is not None and self.preprocessor is not None and self.feature_names:
                    self.is_trained = True
                    print("Loaded combined artifact from models/: isoforest_sim_pipeline.joblib")
                    return True

            if os.path.exists(model_fp) and os.path.exists(prep_fp) and os.path.exists(feat_fp):
                self.model = joblib.load(model_fp)
                self.preprocessor = joblib.load(prep_fp)
                with open(feat_fp, 'r') as f:
                    self.feature_names = json.load(f)
                self.is_trained = True
                print("Loaded model and preprocessor from models/ directory")
                return True
        except Exception as e:
            print(f"Model load attempt from models/ failed: {e}")

        # 2) Fallback: artifacts saved by the notebook in project root
        try:
            repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            alt_combo = os.path.join(repo_root, 'isoforest_sim_pipeline.joblib')
            if os.path.exists(alt_combo):
                artifact = joblib.load(alt_combo)
                self.model = artifact.get('model')
                self.preprocessor = artifact.get('preprocessor')
                self.feature_names = artifact.get('feature_names')
                if self.model is not None and self.preprocessor is not None and self.feature_names:
                    self.is_trained = True
                    print("Loaded combined artifact from repo root: isoforest_sim_pipeline.joblib")
                    return True

            alt_model = os.path.join(repo_root, 'isolation_forest_model.pkl')
            alt_prep = os.path.join(repo_root, 'preprocessor.pkl')
            alt_feats = os.path.join(repo_root, 'feature_names.json')
            if os.path.exists(alt_model) and os.path.exists(alt_prep) and os.path.exists(alt_feats):
                self.model = joblib.load(alt_model)
                self.preprocessor = joblib.load(alt_prep)
                with open(alt_feats, 'r') as f:
                    self.feature_names = json.load(f)
                self.is_trained = True
                print("Loaded model and preprocessor from repo root")
                return True

            # Very last resort: model only (not recommended) – cannot predict without preprocessor
            alt_model_only = os.path.join(repo_root, 'isolation_forest_sim.pkl')
            if os.path.exists(alt_model_only):
                self.model = joblib.load(alt_model_only)
                # Without preprocessor/feature_names we cannot safely proceed
                print("Found model-only artifact but missing preprocessor/feature_names. Please export preprocessor too.")
        except Exception as e:
            print(f"Model load attempt from repo root failed: {e}")

        return False

def train_and_save_model():
    """Train model with the existing dataset and save it"""
    detector = SIManomalyDetector()
    
    # Load the dataset
    data_path = '../sim_dataset_with_phone_features.xlsx'
    df = detector.load_data(data_path)
    
    if df is not None:
        # Train model
        success = detector.train_model(df, contamination=0.05)
        
        if success:
            # Save model
            detector.save_model()
            
            # Test with sample data
            sample_results = detector.predict_anomalies(df.head(10))
            print(f"Sample predictions: {len(sample_results)} records processed")
            
            # Save sample results
            with open('sample_anomaly_results.json', 'w') as f:
                json.dump(sample_results, f, indent=2)
            
            return True
    
    return False

if __name__ == "__main__":
    # Train and save model when script is run directly
    train_and_save_model()
