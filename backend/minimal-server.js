const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3004;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple upload middleware
const upload = multer({ dest: 'uploads/' });

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Basic upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    console.log('Upload request received');
    console.log('File:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Read the file content
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    console.log('File content preview:', fileContent.substring(0, 200));
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    // Simple CSV parsing
    const lines = fileContent.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',') || [];
    const dataRows = lines.slice(1);
    
    console.log('Parsed headers:', headers);
    console.log('Data rows count:', dataRows.length);
    
    res.json({
      success: true,
      data: {
        id: 'test-' + Date.now(),
        filename: req.file.originalname,
        headers,
        rowCount: dataRows.length,
        columnCount: headers.length,
        recommendedSelection: `A1:${String.fromCharCode(65 + headers.length - 1)}${dataRows.length + 1}`,
        boundaryAnalysis: {
          minRow: 0,
          maxRow: dataRows.length,
          minCol: 0,
          maxCol: headers.length - 1,
          totalCells: (dataRows.length + 1) * headers.length,
          emptyCells: 0,
          hasHeaders: true
        }
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});