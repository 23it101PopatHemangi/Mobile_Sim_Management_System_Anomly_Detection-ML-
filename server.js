// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// const app = express();
// const JWT_SECRET = process.env.JWT_SECRET || 'mySuperSecret';

// app.use(express.json());
// app.use(cors());
// app.use(express.static(path.join(__dirname, '../frontend')));

// // MongoDB connection
// mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/simDashboard', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => console.log('✅ MongoDB connected'))
//   .catch(err => console.error('❌ MongoDB error:', err));

// // Schemas
// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   password: String,
//   role: String
// });
// const User = mongoose.model('User', userSchema);

// const simRequestSchema = new mongoose.Schema({
//   employeeName: String,
//   employeeId: String,
//   mobile: String,
//   designation: String,
//   department: String,
//   email: String,
//   currentProvider: String,
//   requestType: String,
//   justification: String,
//   duration: String,
//   priority: String,
//   status: { type: String, default: 'Pending' },
//   hod: {
//     name: String,
//     email: String,
//     approvalDate: String
//   },
//   assignedSim: String,
//   createdAt: { type: Date, default: Date.now }
// });
// const SimRequest = mongoose.model('SimRequest', simRequestSchema);

// const simInventorySchema = new mongoose.Schema({
//   simNumber: String,
//   provider: String,
//   status: { type: String, default: 'Available' },
//   assignedTo: String,
//   createdAt: { type: Date, default: Date.now }
// });
// const SimInventory = mongoose.model('SimInventory', simInventorySchema);

// // Middleware
// function verifyToken(req, res, next) {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'Unauthorized' });

//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     if (err) return res.status(403).json({ error: 'Invalid token' });
//     req.user = user;
//     next();
//   });
// }

// function requireAdmin(req, res, next) {
//   if (req.user.role !== 'Admin') {return res.status(403).json({ error: 'Access denied' });
// }
//   next();
// }

// // Auth Routes
// app.post('/api/signup', async (req, res) => {
//   const { name, email, password, role } = req.body;
//   try {
//     const hashed = await bcrypt.hash(password, 10);
//     const user = new User({ name, email, password: hashed, role });
//     await user.save();
//     res.status(201).json({ message: 'Signup successful!' });
//   } catch (err) {
//     res.status(400).json({ error: 'Email already exists or invalid data.' });
//   }
// });

// app.post('/api/login', async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ error: 'User not found' });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

//     const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: '2h'
//     });

//     res.json({ message: 'Login successful', role: user.role, token });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // SIM Request Routes
// app.post('/api/requests', verifyToken, async (req, res) => {
//   try {
//     const request = new SimRequest(req.body);
//     await request.save();
//     res.status(201).json({ message: 'Request submitted successfully', request });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to submit request' });
//   }
// });

// app.get('/api/requests', verifyToken, async (req, res) => {
//   try {
//     const filter = req.user.role === 'Employee' ? { email: req.user.email } : {};
//     const requests = await SimRequest.find(filter).sort({ createdAt: -1 });
//     res.json(requests);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch requests' });
//   }
// });
// app.put('/api/requests/:id/approve', verifyToken, requireAdmin, async (req, res) => {
//   try {
//     console.log("👉 Approving request ID:", req.params.id);  // log ID
//     const updated = await SimRequest.findByIdAndUpdate(
//       req.params.id,
//       { status: 'Approved' },
//       { new: true }
//     );
//     console.log("🔁 Updated object:", updated); // log what got updated

//     if (!updated) {
//       return res.status(404).json({ error: "Request not found" });
//     }

//     res.json(updated);
//   } catch (err) {
//     console.error("❌ Approval error:", err);
//     res.status(500).json({ error: "Failed to approve request" });
//   }
// });

// app.put('/api/requests/:id/reject', verifyToken, requireAdmin, async (req, res) => {
//   try {
//     const updated = await SimRequest.findByIdAndUpdate(
//       req.params.id,
//       { status: 'Rejected' },
//       { new: true }
//     );
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to reject request' });
//   }
// });

// // SIM Inventory Routes
// app.post('/api/inventory', async (req, res) => {
//   try {
//     const sim = new SimInventory(req.body);
//     await sim.save();
//     res.status(201).json({ message: 'SIM added to inventory successfully' });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to save SIM inventory' });
//   }
// });

// app.get('/api/inventory', async (req, res) => {
//   try {
//     const filter = {};
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.provider) filter.provider = req.query.provider;

//     const sims = await SimInventory.find(filter);
//     res.json(sims);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch SIM inventory' });
//   }
// });

// app.get('/api/inventory/available', async (req, res) => {
//   try {
//     const available = await SimInventory.find({ status: 'Available' });
//     res.json(available);
//   } catch (err) {
//     res.status(500).json({ error: 'Could not get available SIMs' });
//   }
// });

// app.post('/api/inventory/assign', verifyToken, async (req, res) => {
//   const { simId, requestId } = req.body;

//   try {
//     const sim = await SimInventory.findById(simId);
//     if (!sim || sim.status === 'Assigned') {
//       return res.status(400).json({ error: 'SIM not available' });
//     }

//     const request = await SimRequest.findById(requestId);
//     if (!request || request.status !== 'Approved') {
//       return res.status(400).json({ error: 'Invalid or unapproved request' });
//     }

//     sim.status = 'Assigned';
//     sim.assignedTo = request.employeeName;
//     await sim.save();

//     request.assignedSim = sim.simNumber;
//     await request.save();

//     res.json({ message: 'SIM assigned successfully!' });
//   } catch (err) {
//     res.status(500).json({ error: 'Assignment failed' });
//   }
// });

// // Admin Test
// app.get('/api/admin/stats', verifyToken, requireAdmin, (req, res) => {
//   res.json({ message: 'Hello Admin 👑, here are your stats!' });
// });

// // Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/simDashboard';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

/* Helper: build nodemailer transport options.
   If you are using a self-signed SMTP certificate (e.g. internal relay),
   set SMTP_ALLOW_SELF_SIGNED=true in your .env to allow the connection.
*/
function buildMailTransportOptions(extra = {}) {
  const base = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    logger: true,
    debug: true,
    ...extra
  };

  if (String(process.env.SMTP_ALLOW_SELF_SIGNED || 'false') === 'true') {
    // Allow self-signed certificates (use only in trusted environments)
    base.tls = Object.assign({}, base.tls || {}, { rejectUnauthorized: false });
  }

  return base;
}

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String
});
const User = mongoose.model('User', userSchema);

const simRequestSchema = new mongoose.Schema({
  employeeName: String,
  employeeId: String,
  mobile: String,
  designation: String,
  department: String,
  email: String,
  currentProvider: String,
  requestType: String,
  justification: String,
  duration: String,
  priority: String,
  document: String,
  status: { type: String, default: 'HOD Pending' },
  hod: {
    name: String,
    email: String,
    approvalDate: String,
    status: { type: String, default: 'Pending' }
  },
  assignedSim: String,
  createdAt: { type: Date, default: Date.now }
});
const SimRequest = mongoose.model('SimRequest', simRequestSchema);

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized - No token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("❌ Token verification failed:", err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
}


function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}


// Auth routes
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
  const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, role });
    await user.save();
    res.status(201).json({ message: 'Signup successful' });
  } catch {
    res.status(400).json({ error: 'Email already exists or invalid data' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ message: 'Login successful', token, role: user.role.toLocaleLowerCase() });
});
app.post(
  '/api/requests',
  verifyToken,
  upload.single('document'),
  async (req, res) => {
    try {
      /* 1️⃣  Save the request in MongoDB */
      const simReq = new SimRequest({
        ...req.body,
        document: req.file ? `/uploads/${req.file.filename}` : ''
      });
      await simReq.save();

      /* 2️⃣  Prepare Nodemailer transporter with DEBUG enabled */
      const transporter = nodemailer.createTransport(buildMailTransportOptions());

      /* 3️⃣  Send the e‑mail to HOD */
     await transporter.sendMail({
  from: `"Nayara SIM Portal" <${process.env.SMTP_USER}>`,
  to: process.env.HOD_EMAILS,
  subject: '🔔 New SIM Request – HOD Action Needed',
  html: `
    <h3>New SIM Request</h3>
    <p><b>Employee:</b> ${req.body.employeeName}</p>
    <p><b>Type:</b> ${req.body.requestType}</p>
    <p><b>Justification:</b> ${req.body.justification}</p>
    <p>
      <a href="${process.env.FRONTEND_URL}/login.html?redirect=hod-dashboard.html" style="display:inline-block;padding:10px 20px;background-color:#004b8d;color:white;text-decoration:none;border-radius:5px;">
        👉 Click here to proceed
      </a>
    </p>
        `
      }).then(info => {
        console.log('✅ HOD Notified:', info.response);
      }).catch(err => {
        console.error('❌ Email Error:', err);
      });

      /* 4️⃣  Respond to frontend */
      res.status(201).json({ message: 'Request submitted', request: simReq });
  } catch (err) {
      console.error('❌ Request save / mail error:', err);
      res.status(500).json({ error: 'Failed to submit request' });
    }
  }
);
-// 🔻  REMOVE this entire duplicate block ───────────────
-// const nodemailer = ….
-//router.post('/', authenticateUser, async (req, res) => { … });
-// ──────────────────────────────────────────────────────

// // SIM request submission
// app.post('/api/requests', verifyToken, upload.single('document'), async (req, res) => {
//   try {
//     const reqBody = req.body;
//     const simReq = new SimRequest({
//       ...reqBody,
//       document: req.file ? `/uploads/${req.file.filename}` : ''
//     });
//     await simReq.save();
//     res.status(201).json({ message: 'Request submitted', request: simReq });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to submit request' });
//   }
// });
// // POST /api/requests
// const nodemailer = require('nodemailer');

// router.post('/', authenticateUser, async (req, res) => {
//   try {
//     const newRequest = await SIMRequest.create(req.body);

//     // Example HOD email
//     const hodEmail = 'hod@nayaraenergy.com';

//     // Email setup
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: 'your_email@gmail.com', // use environment variable
//         pass: 'your_password' // use environment variable
//       }
//     });

//     const mailOptions = {
//       from: '"Nayara SIM Portal" <your_email@gmail.com>',
//       to: hodEmail,
//       subject: '🔔 New SIM Request Pending HOD Approval',
//       html: `
//         <h2>New SIM Request</h2>
//         <p><strong>Employee Name:</strong> ${req.body.employeeName}</p>
//         <p><strong>Type:</strong> ${req.body.requestType}</p>
//         <p><strong>Justification:</strong> ${req.body.justification}</p>
//         <p><a href="http://your-frontend.com/hod-dashboard.html">Login to Approve/Reject</a></p>
//       `
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.error('❌ Email Error:', error);
//       } else {
//         console.log('✅ HOD Notified:', info.response);
//       }
//     });

//     res.status(201).json(newRequest);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to create request.' });
//   }
// });


// Get requests by role
app.get('/api/requests', verifyToken, async (req, res) => {
  try {
  let filter = {};

    if (req.user.role === 'Employee') {
      filter.email = req.user.email;
    } else if (req.user.role === 'HOD') {
      filter.status = 'HOD Pending';
    } else if (req.user.role === 'HR') {
      filter.status = 'HR Pending';
    }

    const requests = await SimRequest.find(filter).sort({ createdAt: -1 });
  res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch requests' });
  }
});

// HOD approve/reject
app.put(
  '/api/requests/:id/hod-approve',
  verifyToken,
  requireRole('HOD'),
  async (req, res) => {
    try {
      const { name, email, approvalDate } = req.body;

      /* 1️⃣  Update DB */
      const updated = await SimRequest.findByIdAndUpdate(
        req.params.id,
        {
          status: 'HR Pending',
          hod: { name, email, approvalDate, status: 'Approved' }
        },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Request not found' });

      /* 2️⃣  Notify HR by e‑mail */
      const transporter = nodemailer.createTransport(buildMailTransportOptions());


      await transporter.sendMail({
        from: `"Nayara SIM Portal" <${process.env.SMTP_USER}>`,
        to:   process.env.HR_EMAILS,           // addresses from .env
        subject: '✅ SIM Request approved by HOD – your action needed',
        html: `
          <h3>HOD Approval Notification</h3>
          <p><b>Request ID:</b> ${updated._id}</p>
          <p><b>Employee:</b> ${updated.employeeName}</p>
          <p><b>Type:</b> ${updated.requestType}</p>
          <p><b>HOD:</b> ${name} (${email})</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/login.html?redirect=hr-dashboard.html"
               style="display:inline-block;padding:10px 20px;background:#0a7a32;color:#fff;text-decoration:none;border-radius:5px;">
              👉 Click here to proceed
            </a>
          </p>
        `
      }).then(info => console.log('✅ HR notified:', info.response))
        .catch(err  => console.error('❌ Email‑to‑HR error:', err));

      /* 3️⃣  Respond to frontend */
      res.json({ message: 'HOD approved & HR notified', request: updated });

    } catch (err) {
      console.error('❌ HOD approval failed:', err);
      res.status(500).json({ error: 'HOD approval failed' });
    }
  }
);


app.put('/api/requests/:id/hod-reject', verifyToken, requireRole('HOD'), async (req, res) => {
  try {
    const { name, email, approvalDate } = req.body;
    const updated = await SimRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Rejected by HOD',
        hod: { name, email, approvalDate, status: 'Rejected' }
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'HOD rejected', request: updated });
  } catch (err) {-
    res.status(500).json({ error: 'HOD rejection failed' });
  }
});
app.get('/api/requests/:id', verifyToken, async (req, res) => {
  try {
    const request = await SimRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ request });
  } catch (err) {
    console.error('❌ Error fetching request by ID:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(
  '/api/inventory/assign',
  verifyToken,
  requireRole('Admin'),
  async (req, res) => {
    try {
      const { simId, requestId } = req.body;

      const sim = await SimInventory.findById(simId);
      if (!sim || sim.status === 'Assigned') {
        return res.status(400).json({ error: 'SIM not available' });
      }

      const request = await SimRequest.findById(requestId);
      if (!request || !['Approved by Admin', 'Admin Pending'].includes(request.status)) {
        return res.status(400).json({ error: 'Invalid or unapproved request' });
      }

      // ✅ Assign SIM to employee
      sim.status = 'Assigned';
      sim.assignedTo = request.employeeName;
      await sim.save();

      // ✅ Update SIM request
      request.assignedSim = sim.simNumber;
      request.status = 'SIM Assigned';
      await request.save();

      // ✅ Notify Employee by Email (FIXED: always notify)
      const transporter = nodemailer.createTransport(buildMailTransportOptions());

      await transporter.sendMail({
        from: `"Nayara SIM Portal" <${process.env.SMTP_USER}>`,
        to: request.email,
        subject: '📲 Your SIM Has Been Assigned',
        html: `
          <h3>Dear ${request.employeeName},</h3>
          <p>Your SIM request has been <b>fully approved</b> and a SIM has been assigned to you.</p>
          <ul>
            <li><strong>SIM Number:</strong> ${sim.simNumber}</li>
            <li><strong>Provider:</strong> ${sim.provider}</li>
            <li><strong>Type:</strong> ${request.requestType}</li>
          </ul>
          <p>Please collect the SIM from the Admin or IT helpdesk.</p>
          <p>Thank you,<br/>Nayara SIM Portal</p>
        `
      }).then(info => console.log('✅ Employee notified:', info.response))
        .catch(err => console.error('❌ Email-to-Employee error:', err));

      res.json({ message: 'SIM assigned successfully!', request });

    } catch (err) {
      console.error("❌ Assignment error:", err);
      res.status(500).json({ error: 'Assignment failed' });
    }
  }
);


app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
// Approve request (for HR or Admin)
app.put('/api/requests/:id/approve', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const request = await SimRequest.findById(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // You can add role-based logic if needed
    let newStatus = 'Approved by HR';
    if (req.user.role.toLowerCase() === 'admin') {
      newStatus = 'Approved by Admin';
    }

    request.status = newStatus;
    await request.save();

    res.json({ message: `${newStatus}`, request });
  } catch (err) {
    console.error("❌ Approve error:", err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// HR Forward to Admin
app.put(
  '/api/requests/:id/forward',
  verifyToken,
  requireRole('HR'),
  upload.single('document'),
  async (req, res) => {
    try {
      const id = req.params.id;
      const updateData = { status: 'Admin Pending' };
      if (req.file) updateData.document = `/uploads/${req.file.filename}`;

      const updated = await SimRequest.findByIdAndUpdate(id, updateData, { new: true });
      if (!updated) return res.status(404).json({ error: 'Request not found to forward' });

      /* 🔔  Notify Admin ---------------------------------------------- */
      const transporter = nodemailer.createTransport(buildMailTransportOptions());

      await transporter.sendMail({
        from: `"Nayara SIM Portal" <${process.env.SMTP_USER}>`,
        to:   process.env.ADMIN_EMAILS,           // ← comes from .env
        subject: '📨 SIM Request approved by HR – Admin action needed',
        html: `
          <h3>HR Approval Notification</h3>
          <p><b>Request ID:</b> ${updated._id}</p>
          <p><b>Employee:</b> ${updated.employeeName}</p>
          <p><b>Type:</b> ${updated.requestType}</p>
          <p><b>Status:</b> HR approved – awaiting Admin</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/login.html?redirect=admin-dashboard.html"
               style="display:inline-block;padding:10px 20px;background:#D97706;color:#fff;text-decoration:none;border-radius:5px;">
              👉 Click here to proceed
            </a>
          </p>
        `
      }).then(info => console.log('✅ Admin notified:', info.response))
        .catch(err  => console.error('❌ Email‑to‑Admin error:', err));
      /* --------------------------------------------------------------- */

      res.json({ message: 'Request forwarded to Admin & mail sent', request: updated });
    } catch (err) {
      console.error('❌ Forward error:', err);
      res.status(500).json({ error: 'Failed to forward to Admin' });
    }
  }
);




// SIM Inventory Schema (ADD THIS if not already included)
const simInventorySchema = new mongoose.Schema({
  simNumber: { type: String, required: true },
  provider: { type: String, required: true },
  status: { type: String, default: 'Available' },
  assignedTo: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const SimInventory = mongoose.model('SimInventory', simInventorySchema);

app.post('/api/inventory', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    console.log("📥 Inventory Payload:", req.body);  // ✅ log payload
    const sim = new SimInventory(req.body);
    await sim.save();
    res.status(201).json({ message: 'SIM added to inventory successfully' });
  } catch (err) {
    console.error("❌ Inventory save error:", err);   // ✅ log real error
    res.status(500).json({ error: 'Failed to save SIM inventory' });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider = req.query.provider;

    const sims = await SimInventory.find(filter);
    res.json(sims);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SIM inventory' });
  }
});
app.get('/api/inventory/available', async (req, res) => {
  try {
    const available = await SimInventory.find({ status: 'Available' });
    res.json(available);
  } catch (err) {
    res.status(500).json({ error: 'Could not get available SIMs' });
  }
});

// ==================== ML ANOMALY DETECTION ENDPOINTS ====================
const ML_API_URL = 'http://localhost:5001';

// Anomaly Detection Schema
const anomalySchema = new mongoose.Schema({
  sim_id: String,
  customer_id: String,
  phone_no: String,
  operator: String,
  status: String,
  anomaly_score: Number,
  is_anomaly: Boolean,
  confidence: Number,
  timestamp: { type: Date, default: Date.now },
  processed_at: { type: Date, default: Date.now }
});

// Generate and persist a single test anomaly for quick validation
app.post('/api/anomalies/generate-test', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    // Highly abnormal record
    const testRecord = {
      sim_id: 'TEST_SPIKE_' + Date.now(),
      customer_id: 'CUST_TEST',
      'Phone no': '9990012345',
      operator: 'VI',
      status: 'Active',
      registered_location: 'Mumbai',
      current_location: 'Delhi',
      call_count_outgoing: 0,
      call_count_incoming: 0,
      avg_call_duration: 0.1,
      sms_count_sent: 0,
      sms_count_received: 0,
      avg_daily_usage: 1,
      usage_variance: 0
    };

    // Predict with contamination override to ensure anomalies if it's extreme
    const mlResp = await fetch(`${ML_API_URL}/api/ml/batch-predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [testRecord], contamination: 0.2 })
    });
    if (!mlResp.ok) {
      const t = await mlResp.text();
      throw new Error(`ML API failed: ${mlResp.status} ${t}`);
    }
    const mlData = await mlResp.json();
    const results = mlData.results || [];
    if (results.length === 0) return res.status(500).json({ error: 'No ML result' });

    // Persist to DB
    const docs = results.map(r => ({
      sim_id: r.sim_id,
      customer_id: r.customer_id || '',
      phone_no: r.phone_no || '',
      operator: r.operator || '',
      status: r.status || '',
      anomaly_score: Number(r.anomaly_score || 0),
      is_anomaly: Boolean(r.is_anomaly),
      confidence: Number(r.confidence || Math.abs(Number(r.anomaly_score || 0))),
      timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
      processed_at: new Date()
    }));

    const inserted = await Anomaly.insertMany(docs);
    // Notify impacted employees for each anomalous SIM
try {
  const transporter = nodemailer.createTransport(buildMailTransportOptions());

  // Group anomalies by employee email to avoid sending multiple emails to same user
  const anomalous = inserted.filter(d => d.is_anomaly);
  const byEmployee = new Map();

  for (const a of anomalous) {
    // Find employee via SimRequest by employeeId OR phone_no OR sim_id
    const match = await SimRequest.findOne({
      $or: [
        { employeeId: a.customer_id },
        { mobile: a.phone_no },
        { assignedSim: a.sim_id }
      ]
    });

    const email = match?.email;
    if (!email) continue;

    const employeeName = match?.employeeName || 'User';
    const list = byEmployee.get(email) || { employeeName, items: [] };
    list.items.push(a);
    byEmployee.set(email, list);
  }

  // Send one mail per employee
  for (const [email, { employeeName, items }] of byEmployee.entries()) {
    const rows = items.map(x => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #eee;">${x.sim_id}</td>
        <td style="padding:6px 10px;border:1px solid #eee;">${x.operator || '-'}</td>
        <td style="padding:6px 10px;border:1px solid #eee;">${x.status || '-'}</td>
        <td style="padding:6px 10px;border:1px solid #eee;">${Number(x.anomaly_score).toFixed(4)}</td>
        <td style="padding:6px 10px;border:1px solid #eee;">${new Date(x.timestamp).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <h3>Unusual Activity Detected on Your SIM${items.length > 1 ? 's' : ''}</h3>
      <p>Dear ${employeeName},</p>
      <p>Our system detected unusual usage patterns on your SIM${items.length > 1 ? 's' : ''}. Please review below and contact Admin/IT if this is unexpected.</p>
      <table style="border-collapse:collapse;border:1px solid #eee;">
        <thead>
          <tr style="background:#f7fafc;">
            <th style="padding:6px 10px;border:1px solid #eee;">SIM ID</th>
            <th style="padding:6px 10px;border:1px solid #eee;">Operator</th>
            <th style="padding:6px 10px;border:1px solid #eee;">Status</th>
            <th style="padding:6px 10px;border:1px solid #eee;">Anomaly Score</th>
            <th style="padding:6px 10px;border:1px solid #eee;">Timestamp</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Dashboard: <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/anomalies.html">Open Anomalies Dashboard</a></p>
    `;

    try {
      await transporter.sendMail({
        from: `"Nayara SIM Portal" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Alert: Unusual SIM activity detected (${items.length} item${items.length > 1 ? 's' : ''})`,
        html
      });
    } catch (e) {
      console.error(`✉️  Failed to notify employee ${email}:`, e.message);
    }
  }
} catch (empMailErr) {
  console.error('✉️  Failed to send employee anomaly notifications:', empMailErr.message);
}
    res.json({ message: 'Test anomaly generated', inserted });
  } catch (err) {
    console.error('❌ Generate test anomaly error:', err);
    res.status(500).json({ error: 'Failed to generate test anomaly: ' + err.message });
  }
});
const Anomaly = mongoose.model('Anomaly', anomalySchema);

// Get all anomalies
app.get('/api/anomalies', async (req, res) => {
  try {
    const anomalies = await Anomaly.find().sort({ timestamp: -1 }).limit(100);
  res.json(anomalies);
  } catch (err) {
    console.error('❌ Error fetching anomalies:', err);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// Get anomaly statistics
app.get('/api/anomalies/stats', async (req, res) => {
  try {
    const total = await Anomaly.countDocuments();
    const anomalyCount = await Anomaly.countDocuments({ is_anomaly: true });
    const normalCount = total - anomalyCount;
    const anomalyPercentage = total > 0 ? (anomalyCount / total) * 100 : 0;

    // Get recent anomalies (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAnomalies = await Anomaly.countDocuments({
      is_anomaly: true,
      timestamp: { $gte: yesterday }
    });

    res.json({
      total_records: total,
      anomaly_count: anomalyCount,
      normal_count: normalCount,
      anomaly_percentage: Math.round(anomalyPercentage * 100) / 100,
      recent_anomalies_24h: recentAnomalies,
      last_updated: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error fetching anomaly stats:', err);
    res.status(500).json({ error: 'Failed to fetch anomaly statistics' });
  }
});

// Convenience route: redirect to the anomaly dashboard page (token will be used by API calls on that page)
app.get('/admin/anomalies', (req, res) => {
  return res.redirect('/anomalies.html');
});

// Run anomaly detection on SIM data
app.post('/api/anomalies/detect', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    // Get SIM data from inventory and requests
    const simInventory = await SimInventory.find();
    const simRequests = await SimRequest.find();

    // Prepare data for ML model
    const simData = [];
    
    // Process inventory data
    simInventory.forEach(sim => {
      const request = simRequests.find(req => req.assignedSim === sim.simNumber);
      
      simData.push({
        sim_id: sim.simNumber,
        customer_id: request ? request.employeeId : '',
        phone_no: request ? request.mobile : '',
        operator: sim.provider,
        status: sim.status,
        call_count_outgoing: Math.floor(Math.random() * 100), // Mock data
        call_count_incoming: Math.floor(Math.random() * 100),
        avg_call_duration: Math.random() * 10,
        sms_count_sent: Math.floor(Math.random() * 50),
        sms_count_received: Math.floor(Math.random() * 50),
        avg_daily_usage: Math.random() * 2000,
        usage_variance: Math.random() * 1000,
        registered_location: 'Mumbai',
        current_location: 'Mumbai'
      });
    });

    if (simData.length === 0) {
      return res.status(400).json({ error: 'No SIM data available for analysis' });
    }

    // Call ML API
    const mlResponse = await fetch(`${ML_API_URL}/api/ml/batch-predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: simData })
    });

    if (!mlResponse.ok) {
      throw new Error(`ML API error: ${mlResponse.status}`);
    }

    const mlResults = await mlResponse.json();

    // Save results to database
    const anomalies = [];
    for (const result of mlResults.results) {
      const anomaly = new Anomaly(result);
      await anomaly.save();
      anomalies.push(anomaly);
    }

    // Save results to JSON file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `anomaly_results_${timestamp}.json`;
    const filepath = path.join(__dirname, 'uploads', filename);
    
    fs.writeFileSync(filepath, JSON.stringify({
      timestamp: new Date().toISOString(),
      total_records: mlResults.total_processed,
      anomalies_found: mlResults.anomalies_found,
      results: mlResults.results
    }, null, 2));

    res.json({
      message: 'Anomaly detection completed',
      total_processed: mlResults.total_processed,
      anomalies_found: mlResults.anomalies_found,
      anomalies: anomalies.filter(a => a.is_anomaly),
      output_file: filename,
      file_path: `/uploads/${filename}`,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Anomaly detection error:', err);
    res.status(500).json({ error: 'Anomaly detection failed: ' + err.message });
  }
});

// Get specific anomaly details
app.get('/api/anomalies/:id', verifyToken, async (req, res) => {
  try {
    const anomaly = await Anomaly.findById(req.params.id);
    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    res.json(anomaly);
  } catch (err) {
    console.error('❌ Error fetching anomaly:', err);
    res.status(500).json({ error: 'Failed to fetch anomaly details' });
  }
});

// Delete anomaly record
app.delete('/api/anomalies/:id', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    const deleted = await Anomaly.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    res.json({ message: 'Anomaly record deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting anomaly:', err);
    res.status(500).json({ error: 'Failed to delete anomaly record' });
  }
});

// Clear all anomaly records
app.delete('/api/anomalies', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    const result = await Anomaly.deleteMany({});
    res.json({ 
      message: 'All anomaly records cleared successfully',
      deleted_count: result.deletedCount 
    });
  } catch (err) {
    console.error('❌ Error clearing anomalies:', err);
    res.status(500).json({ error: 'Failed to clear anomaly records' });
  }
});

// ==================== END ML ENDPOINTS ====================

// Import anomaly results (from dashboard Predict-from-File) and persist in DB
app.post('/api/anomalies/import', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.results)) {
      return res.status(400).json({ error: 'results array is required' });
    }

    const docs = payload.results.map(r => ({
      sim_id: r.sim_id,
      customer_id: r.customer_id || '',
      phone_no: r.phone_no || '',
      operator: r.operator || '',
      status: r.status || '',
      anomaly_score: Number(r.anomaly_score || 0),
      is_anomaly: Boolean(r.is_anomaly),
      confidence: Number(r.confidence || Math.abs(Number(r.anomaly_score || 0))),
      timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
      processed_at: new Date()
    }));

    if (docs.length === 0) {
      return res.status(400).json({ error: 'No valid rows to import' });
    }

    const inserted = await Anomaly.insertMany(docs);

    // Send email to admins if anomalies were detected
    try {
      const adminList = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const ccList = (process.env.ANOMALY_ALERT_CC || '').split(',').map(e => e.trim()).filter(Boolean);
      const anomalyOnly = inserted.filter(d => d.is_anomaly);
      if (adminList.length > 0 && anomalyOnly.length > 0) {
        const transporter = nodemailer.createTransport(buildMailTransportOptions());
        const preview = anomalyOnly.slice(0, 5).map(a => `• SIM ${a.sim_id} | Score ${a.anomaly_score?.toFixed(4)} | Operator ${a.operator}`).join('\n');
        await transporter.sendMail({
          from: `"Nayara SIM Portal" <${process.env.SMTP_USER}>`,
          to: adminList,
          cc: ccList,
          subject: `[SIM Anomaly] ${anomalyOnly.length} anomalies detected (${inserted.length} records imported)`,
          html: `
            <h3>New Anomalies Detected</h3>
            <p><b>Total imported:</b> ${inserted.length}</p>
            <p><b>Anomalies:</b> ${anomalyOnly.length}</p>
            <pre>${preview}</pre>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/anomalies.html">Open Dashboard</a></p>
          `
        });
      }
    } catch (mailErr) {
      console.error('✉️  Failed to send anomaly email:', mailErr.message);
    }

    // Notify impacted employees for each anomalous SIM (also CC override)
    try {
      const transporter = nodemailer.createTransport(buildMailTransportOptions());

      const ccList = (process.env.ANOMALY_ALERT_CC || '').split(',').map(e => e.trim()).filter(Boolean);
      const anomalous = inserted.filter(d => d.is_anomaly);

      // Group by employee primary email (fallback to CC if not found)
      const byEmployee = new Map();
      for (const a of anomalous) {
        const match = await SimRequest.findOne({
          $or: [
            { employeeId: a.customer_id },
            { mobile: a.phone_no },
            { assignedSim: a.sim_id }
          ]
        });
        const primary = match?.email || null;
        const employeeName = match?.employeeName || 'User';

        const key = primary || (ccList[0] || 'fallback');
        const bucket = byEmployee.get(key) || { employeeName, items: [], primary };
        bucket.items.push(a);
        byEmployee.set(key, bucket);
      }

      for (const [key, { employeeName, items, primary }] of byEmployee.entries()) {
        const rows = items.map(x => `
          <tr>
            <td style="padding:6px 10px;border:1px solid #eee;">${x.sim_id}</td>
            <td style="padding:6px 10px;border:1px solid #eee;">${x.operator || '-'}</td>
            <td style="padding:6px 10px;border:1px solid #eee;">${x.status || '-'}</td>
            <td style="padding:6px 10px;border:1px solid #eee;">${Number(x.anomaly_score).toFixed(4)}</td>
            <td style="padding:6px 10px;border:1px solid #eee;">${new Date(x.timestamp).toLocaleString()}</td>
          </tr>
        `).join('');

        const html = `
          <h3>Unusual Activity Detected on Your SIM${items.length > 1 ? 's' : ''}</h3>
          <p>Dear ${employeeName},</p>
          <p>Our system detected unusual usage patterns on your SIM${items.length > 1 ? 's' : ''}. Please review below and contact Admin/IT if this is unexpected.</p>
          <table style="border-collapse:collapse;border:1px solid #eee;">
            <thead>
              <tr style="background:#f7fafc;">
                <th style="padding:6px 10px;border:1px solid #eee;">SIM ID</th>
                <th style="padding:6px 10px;border:1px solid #eee;">Operator</th>
                <th style="padding:6px 10px;border:1px solid #eee;">Status</th>
                <th style="padding:6px 10px;border:1px solid #eee;">Anomaly Score</th>
                <th style="padding:6px 10px;border:1px solid #eee;">Timestamp</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p>Dashboard: <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/anomalies.html">Open Anomalies Dashboard</a></p>
        `;

        try {
          await transporter.sendMail({
            from: `"Nayara SIM Portal" <${process.env.SMTP_USER}>`,
            to: primary ? [primary] : ccList,
            cc: ccList,
            subject: `Alert: Unusual SIM activity detected (${items.length} item${items.length > 1 ? 's' : ''})`,
            html
          });
        } catch (e) {
          console.error(`✉️  Failed to notify employee ${primary || ccList[0] || 'unknown'}:`, e.message);
        }
      }
    } catch (empMailErr) {
      console.error('✉️  Failed to send employee anomaly notifications:', empMailErr.message);
    }
    res.json({
      message: 'Imported anomaly results successfully',
      inserted_count: inserted.length
    });
  } catch (err) {
    console.error('❌ Import anomalies error:', err);
    res.status(500).json({ error: 'Failed to import anomalies' });
  }
});

