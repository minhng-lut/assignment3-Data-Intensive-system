const path = require('path');
const readline = require('readline');
const Database = require('better-sqlite3');
const resetDatabases = require('./init');

const DB_DIR = path.join(__dirname, 'db');

const DATABASES = [
  {
    id: '1',
    name: 'Library North',
    file: path.join(DB_DIR, 'library_north.sqlite')
  },
  {
    id: '2',
    name: 'Library Central',
    file: path.join(DB_DIR, 'library_central.sqlite')
  },
  {
    id: '3',
    name: 'Library South',
    file: path.join(DB_DIR, 'library_south.sqlite')
  }
];

const TABLES = ['authors', 'books', 'members', 'branches', 'loans'];

const UPDATABLE_COLUMNS = {
  authors: ['name', 'country'],
  books: ['title', 'year', 'genre'],
  members: ['name', 'email'],
  branches: ['name', 'city'],
  loans: ['loan_date', 'return_date']
};

// Setup readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function printRows(tableName, rows) {
  console.log(`\n=== ${tableName.toUpperCase()} ===`);
  if (!rows || rows.length === 0) {
    console.log('(no rows)');
  } else {
    console.table(rows);
  }
}

async function handlePrintData(db) {
  console.log('\nAvailable tables: authors, books, members, branches, loans, all');
  const table = (await ask('Which table do you want to print? ')).toLowerCase();

  if (table === 'all') {
    TABLES.forEach(t => {
      const rows = db.prepare(`SELECT * FROM ${t}`).all();
      printRows(t, rows);
    });
    return;
  }

  if (!TABLES.includes(table)) {
    console.log('Invalid table name.');
    return;
  }

  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  printRows(table, rows);
}

async function handleUpdateData(db) {
  console.log('\nUpdatable tables: authors, books, members, branches, loans');
  const table = (await ask('Which table do you want to update? ')).toLowerCase();
  if (!TABLES.includes(table)) {
    console.log('Invalid table name.');
    return;
  }

  const validColumns = UPDATABLE_COLUMNS[table];
  console.log(
    `Updatable columns for ${table}: ${validColumns.join(', ')}`
  );

  const idStr = await ask('Enter the ID of the row to update: ');
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) {
    console.log('Invalid ID.');
    return;
  }

  const column = (await ask('Which column do you want to update? ')).toLowerCase();
  if (!validColumns.includes(column)) {
    console.log('Invalid column name.');
    return;
  }

  const newValue = await ask('Enter the new value: ');

  const stmt = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`);
  const result = stmt.run(newValue, id);

  if (result.changes === 0) {
    console.log('No rows were updated (check the ID).');
    return;
  }

  const updatedRow = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  console.log('Row updated successfully:');
  console.table([updatedRow]);
}

async function databaseMenu(db, dbInfo) {
  while (true) {
    console.log(`\n=== Connected to: ${dbInfo.name} ===`);
    console.log('1) Print data');
    console.log('2) Update data');
    console.log('b) Back to database selection');
    console.log('q) Quit');

    const choice = (await ask('Choose an option: ')).toLowerCase();

    if (choice === '1') {
      await handlePrintData(db);
    } else if (choice === '2') {
      await handleUpdateData(db);
    } else if (choice === 'b') {
      break;
    } else if (choice === 'q') {
      rl.close();
      process.exit(0);
    } else {
      console.log('Invalid option.');
    }
  }
}

async function mainMenu() {
  while (true) {
    console.log('\n=== MAIN MENU ===');
    console.log('Databases:');
    DATABASES.forEach(db => {
      console.log(`${db.id}) ${db.name}`);
    });
    console.log('0) Reset databases to original state');
    console.log('q) Quit');

    const choice = (await ask('Select an option: ')).toLowerCase();

    if (choice === 'q') {
      break;
    }

    if (choice === '0') {
      resetDatabases();
      continue;
    }

    const selected = DATABASES.find(db => db.id === choice);
    if (!selected) {
      console.log('Invalid choice.');
      continue;
    }

    const db = new Database(selected.file);
    await databaseMenu(db, selected);
    db.close();
  }

  rl.close();
  console.log('Goodbye!');
}

mainMenu().catch(err => {
  console.error('Unexpected error:', err);
  rl.close();
});
