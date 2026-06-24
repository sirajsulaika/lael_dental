if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: require("path").join(__dirname, ".env") });
}

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PORT: SERVER_PORT } = process.env;

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const UPLOADS = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
app.use("/api/uploads", express.static(UPLOADS));

let pool;

async function nextId(prefix, table) {
  const len = prefix.length;
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(id, ${len + 1}) AS UNSIGNED)), 0) + 1 AS n FROM \`${table}\``
  );
  return `${prefix}${String(rows[0].n).padStart(3, "0")}`;
}

async function initDB() {
  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD || "",
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // Test connection
  await pool.query("SELECT 1");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id VARCHAR(20) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      district VARCHAR(100) DEFAULT '',
      block VARCHAR(100) DEFAULT '',
      principal VARCHAR(255) DEFAULT '',
      contact VARCHAR(20) DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(20) PRIMARY KEY,
      schoolId VARCHAR(20) NOT NULL,
      name VARCHAR(255) NOT NULL,
      \`class\` VARCHAR(20) DEFAULT '',
      section VARCHAR(10) DEFAULT '',
      gender VARCHAR(10) DEFAULT '',
      dob VARCHAR(20) DEFAULT '',
      parent VARCHAR(255) DEFAULT '',
      mobile VARCHAR(20) DEFAULT '',
      FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS screenings (
      id VARCHAR(30) PRIMARY KEY,
      studentId VARCHAR(20) NOT NULL,
      dentist VARCHAR(255) DEFAULT '',
      date VARCHAR(20) DEFAULT '',
      chiefComplaint TEXT,
      oralHygiene VARCHAR(20) DEFAULT '',
      bleedingGums VARCHAR(20) DEFAULT '',
      crowding VARCHAR(255) DEFAULT '',
      missingTeeth VARCHAR(255) DEFAULT '',
      pockets VARCHAR(255) DEFAULT '',
      impaction VARCHAR(255) DEFAULT '',
      softTissue VARCHAR(255) DEFAULT '',
      cervicalAbrasions VARCHAR(255) DEFAULT '',
      stains VARCHAR(255) DEFAULT '',
      \`calculus\` VARCHAR(255) DEFAULT '',
      others TEXT,
      score INT DEFAULT 0,
      priority VARCHAR(20) DEFAULT 'Routine',
      cavityTeeth JSON,
      treatmentsAdvised JSON,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS screening_photos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      screeningId VARCHAR(30) NOT NULL,
      slot VARCHAR(30) NOT NULL,
      filePath VARCHAR(500) NOT NULL,
      UNIQUE KEY uq_screening_slot (screeningId, slot),
      FOREIGN KEY (screeningId) REFERENCES screenings(id) ON DELETE CASCADE
    )
  `);

  // Seed if empty
  const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM schools");
  if (count === 0) {
    console.log("Seeding initial data...");
    const schools = [
      ["SCH001", "Panchayat Union Middle School", "Chennai", "Ambattur", "K. Rajesh", "9841234567"],
      ["SCH002", "Government High School Tambaram", "Chennai", "Tambaram", "S. Meenakshi", "9876543210"],
      ["SCH003", "Adi Dravidar Welfare School", "Coimbatore", "Singanallur", "P. Arumugam", "9994567890"],
    ];
    for (const s of schools) {
      await pool.query("INSERT INTO schools VALUES (?,?,?,?,?,?)", s);
    }

    const students = [
      ["STU001", "SCH001", "Karthik R", "6", "A", "Male", "2013-05-12", "Ramesh K", "9841234567"],
      ["STU002", "SCH001", "Priya S", "7", "B", "Female", "2012-08-20", "Suresh S", "9876543210"],
      ["STU003", "SCH002", "Arun M", "8", "A", "Male", "2011-02-15", "Murugan A", "9994561234"],
      ["STU004", "SCH003", "Deepa V", "6", "C", "Female", "2013-11-30", "Vijay V", "9962345678"],
    ];
    for (const s of students) {
      await pool.query("INSERT INTO students VALUES (?,?,?,?,?,?,?,?,?)", s);
    }

    const screenings = [
      {
        id: "DS-20250601-000001", studentId: "STU001", dentist: "Dr. Priyanka Paul", date: "2025-06-01",
        chiefComplaint: "Tooth pain in lower right", oralHygiene: "Good", bleedingGums: "Good",
        crowding: "", missingTeeth: "", pockets: "", impaction: "", softTissue: "",
        cervicalAbrasions: "", stains: "Mild", calculus: "", others: "",
        score: 82, priority: "Routine",
        cavityTeeth: ["46", "36"], treatmentsAdvised: ["Fillings", "Fluoride Application"],
      },
      {
        id: "DS-20250602-000002", studentId: "STU002", dentist: "Dr. Priyanka Paul", date: "2025-06-02",
        chiefComplaint: "Bleeding gums and bad breath", oralHygiene: "Fair", bleedingGums: "Poor",
        crowding: "Mild crowding in lower anterior", missingTeeth: "", pockets: "4mm in 16, 26",
        impaction: "", softTissue: "", cervicalAbrasions: "", stains: "Moderate", calculus: "Present",
        others: "", score: 49, priority: "High",
        cavityTeeth: ["16", "26", "36", "46"],
        treatmentsAdvised: ["Dental Scaling / Cleaning & Polishing", "Fillings", "Gum Treatment"],
      },
      {
        id: "DS-20250603-000003", studentId: "STU003", dentist: "Dr. Priyanka Paul", date: "2025-06-03",
        chiefComplaint: "Routine checkup", oralHygiene: "Good", bleedingGums: "Good",
        crowding: "", missingTeeth: "", pockets: "", impaction: "", softTissue: "",
        cervicalAbrasions: "", stains: "", calculus: "", others: "",
        score: 100, priority: "Routine", cavityTeeth: [], treatmentsAdvised: [],
      },
    ];
    for (const s of screenings) {
      await pool.query(
        `INSERT INTO screenings (id,studentId,dentist,date,chiefComplaint,oralHygiene,bleedingGums,
          crowding,missingTeeth,pockets,impaction,softTissue,cervicalAbrasions,stains,\`calculus\`,others,
          score,priority,cavityTeeth,treatmentsAdvised)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [s.id, s.studentId, s.dentist, s.date, s.chiefComplaint, s.oralHygiene, s.bleedingGums,
          s.crowding, s.missingTeeth, s.pockets, s.impaction, s.softTissue, s.cervicalAbrasions,
          s.stains, s.calculus, s.others, s.score, s.priority,
          JSON.stringify(s.cavityTeeth), JSON.stringify(s.treatmentsAdvised)]
      );
    }
    console.log("Seed complete.");
  }
}

// --- SCHOOLS ---
app.get("/api/schools", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM schools ORDER BY id");
  res.json(rows);
});

app.post("/api/schools", async (req, res) => {
  const { name, district, block, principal, contact } = req.body;
  const id = await nextId("SCH", "schools");
  await pool.query("INSERT INTO schools VALUES (?,?,?,?,?,?)",
    [id, name, district || "", block || "", principal || "", contact || ""]);
  res.json({ id, name, district: district || "", block: block || "", principal: principal || "", contact: contact || "" });
});

app.delete("/api/schools/:id", async (req, res) => {
  await pool.query("DELETE FROM schools WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// --- STUDENTS ---
app.get("/api/students", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM students ORDER BY id");
  res.json(rows);
});

app.post("/api/students", async (req, res) => {
  const { schoolId, name, class: cls, section, gender, dob, parent, mobile } = req.body;
  const id = await nextId("STU", "students");
  await pool.query("INSERT INTO students VALUES (?,?,?,?,?,?,?,?,?)",
    [id, schoolId, name, cls || "", section || "", gender || "", dob || "", parent || "", mobile || ""]);
  res.json({ id, schoolId, name, class: cls || "", section: section || "", gender: gender || "", dob: dob || "", parent: parent || "", mobile: mobile || "" });
});

app.delete("/api/students/:id", async (req, res) => {
  await pool.query("DELETE FROM students WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// --- SCREENINGS ---
app.get("/api/screenings", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM screenings ORDER BY date DESC, id DESC");
  const [photos] = await pool.query("SELECT * FROM screening_photos");

  const photoMap = {};
  for (const p of photos) {
    if (!photoMap[p.screeningId]) photoMap[p.screeningId] = {};
    photoMap[p.screeningId][p.slot] = `/api/uploads/${p.filePath}`;
  }

  const result = rows.map((r) => ({
    ...r,
    cavityTeeth: typeof r.cavityTeeth === "string" ? JSON.parse(r.cavityTeeth) : r.cavityTeeth || [],
    treatmentsAdvised: typeof r.treatmentsAdvised === "string" ? JSON.parse(r.treatmentsAdvised) : r.treatmentsAdvised || [],
    photos: photoMap[r.id] || {},
  }));
  res.json(result);
});

app.post("/api/screenings", async (req, res) => {
  const {
    id, studentId, dentist, date, chiefComplaint, oralHygiene, bleedingGums,
    crowding, missingTeeth, pockets, impaction, softTissue, cervicalAbrasions,
    stains, calculus, others, score, priority, cavityTeeth, treatmentsAdvised, photos,
  } = req.body;

  await pool.query(
    `INSERT INTO screenings (id,studentId,dentist,date,chiefComplaint,oralHygiene,bleedingGums,
      crowding,missingTeeth,pockets,impaction,softTissue,cervicalAbrasions,stains,\`calculus\`,others,
      score,priority,cavityTeeth,treatmentsAdvised)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, studentId, dentist || "", date || "", chiefComplaint || "", oralHygiene || "", bleedingGums || "",
      crowding || "", missingTeeth || "", pockets || "", impaction || "", softTissue || "",
      cervicalAbrasions || "", stains || "", calculus || "", others || "", score || 0, priority || "Routine",
      JSON.stringify(cavityTeeth || []), JSON.stringify(treatmentsAdvised || [])]
  );

  const savedPhotos = {};
  if (photos) {
    for (const [slot, dataUrl] of Object.entries(photos)) {
      if (!dataUrl || typeof dataUrl !== "string") continue;
      const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (!match) continue;
      const fileName = `${id}_${slot.replace(/\s+/g, "_")}.jpg`;
      fs.writeFileSync(path.join(UPLOADS, fileName), Buffer.from(match[1], "base64"));
      await pool.query(
        "INSERT INTO screening_photos (screeningId, slot, filePath) VALUES (?,?,?)",
        [id, slot, fileName]
      );
      savedPhotos[slot] = `/api/uploads/${fileName}`;
    }
  }

  res.json({
    id, studentId, dentist, date, chiefComplaint, oralHygiene, bleedingGums,
    crowding, missingTeeth, pockets, impaction, softTissue, cervicalAbrasions,
    stains, calculus, others, score, priority,
    cavityTeeth: cavityTeeth || [], treatmentsAdvised: treatmentsAdvised || [],
    photos: savedPhotos,
  });
});

app.delete("/api/screenings/:id", async (req, res) => {
  const [photos] = await pool.query("SELECT filePath FROM screening_photos WHERE screeningId = ?", [req.params.id]);
  for (const p of photos) {
    const fp = path.join(UPLOADS, p.filePath);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await pool.query("DELETE FROM screenings WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// --- DB STATUS ---
app.get("/api/db-status", async (req, res) => {
  try {
    const [[row]] = await pool.query("SELECT 1 AS ok");
    res.json({
      connected: !!row,
      env: process.env.NODE_ENV || "development",
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      user: DB_USER,
    });
  } catch (err) {
    res.json({ connected: false, error: err.message, env: process.env.NODE_ENV || "development" });
  }
});

// --- SERVE REACT BUILD IN PRODUCTION ---
const buildPath = path.join(__dirname, "..", "build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// --- START ---
const PORT = process.env.PORT || SERVER_PORT || 5000;
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT} [${process.env.NODE_ENV || "development"}]`));
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err.message);
    process.exit(1);
  });
