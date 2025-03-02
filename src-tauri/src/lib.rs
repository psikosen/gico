use rusqlite::{Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

// Define the database connection state
struct DbState(Mutex<Connection>);

// Define structures for serialization/deserialization
#[derive(Debug, Serialize, Deserialize)]
struct QueryResult {
    rows: Vec<serde_json::Value>,
    lastInsertRowid: Option<i64>,
    rowsAffected: Option<usize>,
}

// Database Commands
#[tauri::command]
fn create_table(query: &str, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(query, []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_query(query: &str, parameters: Option<Vec<String>>, state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    
    let column_count = stmt.column_count();
    let column_names: Vec<String> = (0..column_count)
        .map(|i| stmt.column_name(i).unwrap_or("").to_string())
        .collect();
    
    let params: Vec<String> = parameters.unwrap_or_default();
    let params_slice: Vec<&dyn rusqlite::ToSql> = params
        .iter()
        .map(|p| p as &dyn rusqlite::ToSql)
        .collect();
    
    let mut rows = Vec::new();
    
    let mut query_result = stmt.query(params_slice.as_slice()).map_err(|e| e.to_string())?;
    
    while let Some(row) = query_result.next().map_err(|e| e.to_string())? {
        let mut map = serde_json::Map::new();
        
        for i in 0..column_count {
            let column_name = &column_names[i];
            let value = match row.get::<_, rusqlite::types::Value>(i) {
                Ok(value) => value,
                Err(_) => continue, // Skip this column if there's an error
            };
            
            // Convert rusqlite Value to serde_json Value
            let json_value = match value {
                rusqlite::types::Value::Null => serde_json::Value::Null,
                rusqlite::types::Value::Integer(i) => serde_json::Value::Number(serde_json::Number::from(i)),
                rusqlite::types::Value::Real(f) => {
                    if let Some(n) = serde_json::Number::from_f64(f) {
                        serde_json::Value::Number(n)
                    } else {
                        serde_json::Value::Null
                    }
                },
                rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
                rusqlite::types::Value::Blob(b) => {
                    serde_json::Value::String(format!("BLOB[{}]", b.len()))
                }
            };
            
            map.insert(column_name.clone(), json_value);
        }
        
        rows.push(serde_json::Value::Object(map));
    }
    
    Ok(rows)
}

#[tauri::command]
fn write_query(query: &str, parameters: Option<Vec<String>>, state: State<'_, DbState>) -> Result<QueryResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let params = parameters.unwrap_or_default();
    let params_slice: Vec<&dyn rusqlite::ToSql> = params
        .iter()
        .map(|p| p as &dyn rusqlite::ToSql)
        .collect();
    
    let result = conn.execute(query, params_slice.as_slice()).map_err(|e| e.to_string())?;
    let last_id = conn.last_insert_rowid();
    
    Ok(QueryResult {
        rows: Vec::new(),
        lastInsertRowid: Some(last_id),
        rowsAffected: Some(result),
    })
}

#[tauri::command]
fn list_tables(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .map_err(|e| e.to_string())?;
    
    let tables = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<String>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(tables)
}

#[tauri::command]
fn describe_table(table_name: &str, state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let query = format!("PRAGMA table_info({})", table_name);
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "cid": row.get::<_, i64>(0)?,
                "name": row.get::<_, String>(1)?,
                "type": row.get::<_, String>(2)?,
                "notnull": row.get::<_, bool>(3)?,
                "dflt_value": row.get::<_, Option<String>>(4)?,
                "pk": row.get::<_, bool>(5)?
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<serde_json::Value>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(rows)
}

// Greet command from the template
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to the AI Conversation Manager.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState(Mutex::new(
            Connection::open("conversations.db").expect("Failed to open database"),
        )))
        .invoke_handler(tauri::generate_handler![
            greet,
            create_table,
            read_query,
            write_query,
            list_tables,
            describe_table
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}