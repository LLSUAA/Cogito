import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface BookRow {
  id: number;
  title: string;
  uri: string;
  current_chapter: number;
  progress: number;
  last_read_time: number;
}

export interface ReadingLogRow {
  id: number;
  date: string;
  words_count: number;
}

// ---------------------------------------------------------------------------
// 数据库单例
// ---------------------------------------------------------------------------

let db: SQLiteDatabase | null = null;

async function getDB(): Promise<SQLiteDatabase> {
  if (db) return db;
  db = await openDatabaseAsync('shendu.db');
  await initSchema(db);
  return db;
}

// ---------------------------------------------------------------------------
// 建表
// ---------------------------------------------------------------------------

async function initSchema(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT NOT NULL,
      uri             TEXT NOT NULL UNIQUE,
      current_chapter INTEGER DEFAULT 1,
      progress        REAL DEFAULT 0.0,
      last_read_time  INTEGER
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS reading_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL UNIQUE,
      words_count INTEGER DEFAULT 0
    );
  `);
}

// ---------------------------------------------------------------------------
// 核心数据操作
// ---------------------------------------------------------------------------

/**
 * 导入新书，或更新已有书籍的最后阅读时间。
 * 使用 `INSERT OR REPLACE` 当 URI 冲突时更新 title 与 last_read_time。
 */
export async function insertOrUpdateBook(
  title: string,
  uri: string
): Promise<void> {
  try {
    const database = await getDB();
    await database.runAsync(
      `INSERT INTO books (title, uri, last_read_time)
       VALUES (?, ?, ?)
       ON CONFLICT(uri) DO UPDATE SET
         title = excluded.title,
         last_read_time = excluded.last_read_time`,
      title,
      uri,
      Date.now()
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '写入书籍数据失败';
    throw new Error(message);
  }
}

/**
 * 更新书籍的阅读进度。
 *
 * @param uri     书籍本地 URI
 * @param chapter 当前章节号
 * @param progress 当前章节内的阅读比例 (0.0 ~ 1.0)
 */
export async function updateBookProgress(
  uri: string,
  chapter: number,
  progress: number
): Promise<void> {
  try {
    const database = await getDB();
    await database.runAsync(
      `UPDATE books SET current_chapter = ?, progress = ?, last_read_time = ? WHERE uri = ?`,
      chapter,
      progress,
      Date.now(),
      uri
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '更新阅读进度失败';
    throw new Error(message);
  }
}

/**
 * 获取全部书籍列表，按最近阅读时间倒序排列。
 */
export async function getAllBooks(): Promise<BookRow[]> {
  try {
    const database = await getDB();
    return await database.getAllAsync<BookRow>(
      'SELECT * FROM books ORDER BY last_read_time DESC'
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '读取书架数据失败';
    throw new Error(message);
  }
}