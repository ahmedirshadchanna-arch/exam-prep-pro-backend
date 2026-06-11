const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Setup Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Initialize SQLite DB
const dbFile = path.join(__dirname, 'curriculum.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS strands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER,
            name TEXT,
            FOREIGN KEY(subject_id) REFERENCES subjects(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS competencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strand_id INTEGER,
            name TEXT,
            FOREIGN KEY(strand_id) REFERENCES strands(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS learning_objectives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            competency_id INTEGER,
            objective TEXT,
            grade TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS content_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            objective_id INTEGER,
            type TEXT,
            content TEXT,
            ao_level TEXT,
            FOREIGN KEY(objective_id) REFERENCES learning_objectives(id)
        )`);
    }
});

// Endpoint to upload and parse Excel Domain
app.post('/api/domain/import', upload.single('excel_file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const domainName = req.body.domain; // e.g., 'Physics', 'Mathematics'
    const filePath = path.join(__dirname, req.file.path);

    // Call Python Parser using uv
    const pythonScript = path.join(__dirname, 'parser.py');
    
    // Call Python Parser using python3 (native cloud environment)
    const command = `python3 ${pythonScript} "${filePath}" "${domainName}" "${dbFile}"`;
    
    exec(command, (error, stdout, stderr) => {
        // Cleanup uploaded file
        fs.unlinkSync(filePath);

        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Failed to process Excel file', details: stderr });
        }
        res.json({ message: 'Domain imported successfully', output: stdout });
    });
});

// Endpoint to fetch full hierarchy for Student Player
app.get('/api/curriculum/:domain', (req, res) => {
    const domain = req.params.domain;
    db.get('SELECT id FROM subjects WHERE name = ?', [domain], (err, subject) => {
        if (err || !subject) return res.status(404).json({ error: 'Domain not found' });
        
        db.all('SELECT * FROM strands WHERE subject_id = ?', [subject.id], (err, strands) => {
            if (err) return res.status(500).json({ error: err.message });
            // For brevity in this skeleton, returning strands. 
            // We would do JOINs to get full tree.
            res.json({ domain, strands });
        });
    });
});

app.listen(port, () => {
    console.log(`Curriculum Engine Backend running on http://localhost:${port}`);
});
