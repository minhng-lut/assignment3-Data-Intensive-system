const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, 'db');

// Ensure /db exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

const DB_CONFIGS = [
  { file: path.join(DB_DIR, 'library_north.sqlite'), label: 'NORTH' },
  { file: path.join(DB_DIR, 'library_central.sqlite'), label: 'CENTRAL' },
  { file: path.join(DB_DIR, 'library_south.sqlite'), label: 'SOUTH' }
];

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function createAndSeedDatabase(filePath, label) {
  const db = new Database(filePath);

  // Schema: 5 tables
  db.exec(`
    CREATE TABLE authors (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT NOT NULL
    );

    CREATE TABLE books (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      author_id INTEGER,
      year INTEGER,
      genre TEXT
    );

    CREATE TABLE members (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );

    CREATE TABLE branches (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL
    );

    CREATE TABLE loans (
      id INTEGER PRIMARY KEY,
      book_id INTEGER,
      member_id INTEGER,
      loan_date TEXT,
      return_date TEXT
    );
  `);

  db.exec('BEGIN');

  // ============ COMMON (REPLICATED) DATA (same across all DBs) ============

  // 5 common authors
  const insertAuthor = db.prepare(
    'INSERT INTO authors (id, name, country) VALUES (?, ?, ?)'
  );
  const commonAuthors = [
    [1, 'Alice Walker', 'USA'],
    [2, 'Bob Smith', 'UK'],
    [3, 'Carla Rossi', 'Italy'],
    [4, 'David Chen', 'China'],
    [5, 'Emma Johansson', 'Sweden']
  ];
  commonAuthors.forEach(a => insertAuthor.run(...a));

  // 5 common members
  const insertMember = db.prepare(
    'INSERT INTO members (id, name, email) VALUES (?, ?, ?)'
  );
  const commonMembers = [
    [1, 'John Doe', 'john@example.com'],
    [2, 'Jane Doe', 'jane@example.com'],
    [3, 'Mark Miller', 'mark@example.com'],
    [4, 'Sara Connor', 'sara@example.com'],
    [5, 'Paul Atreides', 'paul@example.com']
  ];
  commonMembers.forEach(m => insertMember.run(...m));

  // 5 common branches
  const insertBranch = db.prepare(
    'INSERT INTO branches (id, name, city) VALUES (?, ?, ?)'
  );
  const commonBranches = [
    [1, 'Main Library', 'Helsinki'],
    [2, 'City Library', 'Espoo'],
    [3, 'University Library', 'Tampere'],
    [4, 'Community Library', 'Oulu'],
    [5, 'Student Library', 'Turku']
  ];
  commonBranches.forEach(b => insertBranch.run(...b));

  // 5 common books (using authors 1-5)
  const insertBook = db.prepare(
    'INSERT INTO books (id, title, author_id, year, genre) VALUES (?, ?, ?, ?, ?)'
  );
  const commonBooks = [
    [1, 'Distributed Systems 101', 1, 2015, 'Computer Science'],
    [2, 'Advanced Databases', 2, 2018, 'Computer Science'],
    [3, 'Intro to Algorithms', 3, 2010, 'Computer Science'],
    [4, 'Design Patterns', 4, 2004, 'Software Engineering'],
    [5, 'Clean Code', 5, 2008, 'Software Engineering']
  ];
  commonBooks.forEach(b => insertBook.run(...b));

  // 5 common loans (linking the common books & members)
  const insertLoan = db.prepare(
    'INSERT INTO loans (id, book_id, member_id, loan_date, return_date) VALUES (?, ?, ?, ?, ?)'
  );
  const commonLoans = [
    [1, 1, 1, '2025-01-05', '2025-01-20'],
    [2, 2, 2, '2025-01-06', '2025-01-21'],
    [3, 3, 3, '2025-01-07', '2025-01-22'],
    [4, 4, 4, '2025-01-08', '2025-01-23'],
    [5, 5, 5, '2025-01-09', '2025-01-24']
  ];
  commonLoans.forEach(l => insertLoan.run(...l));

  // ============ FRAGMENTED DATA (different per DB) ============

  // Extra authors (same IDs, but different names per DB)
  for (let id = 6; id <= 10; id++) {
    insertAuthor.run(id, `${label} Author ${id}`, `${label}-Country`);
  }

  // Extra members
  for (let id = 6; id <= 10; id++) {
    insertMember.run(
      id,
      `${label} Member ${id}`,
      `member${id.toString().padStart(2, '0')}@${label.toLowerCase()}.example.com`
    );
  }

  // Extra branches
  for (let id = 6; id <= 10; id++) {
    insertBranch.run(id, `${label} Branch ${id}`, `${label} City ${id}`);
  }

  // Extra books (author_id from 6-10)
  for (let id = 6; id <= 10; id++) {
    insertBook.run(
      id,
      `${label} Book ${id}`,
      id, // uses extra authors 6-10
      2000 + id,
      `${label} Genre`
    );
  }

  // Extra loans (link some of the extra books & members)
  for (let id = 6; id <= 10; id++) {
    insertLoan.run(
      id,
      id, // book_id 6-10
      id, // member_id 6-10
      `2025-02-${(id + 10).toString().padStart(2, '0')}`,
      `2025-03-${(id + 10).toString().padStart(2, '0')}`
    );
  }

  db.exec('COMMIT');
  db.close();
}

function resetDatabases() {
  console.log('Resetting databases...');

  DB_CONFIGS.forEach(({ file, label }) => {
    removeIfExists(file);
    createAndSeedDatabase(file, label);
    console.log(`Created and seeded: ${path.basename(file)} (${label})`);
  });

  console.log('All databases have been reset to original state.');
}

// If run directly: reset
if (require.main === module) {
  resetDatabases();
} else {
  module.exports = resetDatabases;
}
