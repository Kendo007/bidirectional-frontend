// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:8080/api/ingestion';

function App() {
  const [connected, setConnected] = useState(false);
  const [props, setProps] = useState({
    protocol: 'http',
    host: '',
    port: '',
    database: '',
    username: '',
    jwtToken: '',
    password: '',
    delimiter: ','
  });
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCols, setSelectedCols] = useState([]);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isNewTable, setIsNewTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [progress, setProgress] = useState(0);
  const [previewRows, setPreviewRows] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPreviewModalCSV, setShowPreviewModalCSV] = useState(false);
  const [csvCols, setCsvCols] = useState([]);
  const [selectedCsvCols, setSelectedCsvCols] = useState([]);

  // --- Column Types ---
  const [typeOptions, setTypeOptions] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState({});

  // --- Fetch type options once upon successful connection ---
  useEffect(() => {
    if (!connected) return;
    axios
      .post(`${API_BASE}/types`, props)
      .then(res => setTypeOptions(res.data))
      .catch(err => console.error('Failed to load type options', err));
  },
    // eslint-disable-next-line
    [connected]);

  const loadCsvColumnsAndPreview = async () => {
    if (!file) return setMessage("❌ Please select a file.");

    try {
      const previewFile = await getTrimmedCsvFile(file);

      const formData = new FormData();
      formData.append("file", previewFile);
      formData.append("tableName", isNewTable ? newTableName : selectedTable);
      formData.append("config", new Blob([JSON.stringify(props)], { type: 'application/json' }));

      const res = await axios.post(`${API_BASE}/preview-csv`, formData);
      const { headers, data } = res.data;

      setCsvCols(headers);
      setPreviewRows(data);
      setShowPreviewModalCSV(true);
      setMessage("✅ CSV preview loaded.");
    } catch (err) {
      setMessage("❌ Failed to preview CSV: " + (err.response?.data?.error || err.message));
    }
  };

  const getTrimmedCsvFile = (originalFile, lineLimit = 100) => {
    return new Promise((resolve, reject) => {
      const CHUNK_SIZE = 64 * 1024; // 64KB
      const reader = new FileReader();
      let offset = 0;
      let textBuffer = '';
      let lines = [];

      const processLines = () => {
        const allLines = textBuffer.split(/\r?\n/);
        // Save last partial line back to buffer for next chunk
        textBuffer = allLines.pop();
        lines.push(...allLines);

        if (lines.length >= lineLimit + 1 || offset >= originalFile.size) {
          // Final chunk or limit reached
          const finalLines = lines.slice(0, lineLimit + 1);
          if (textBuffer && offset >= originalFile.size) {
            finalLines.push(textBuffer); // include last line if file ended
          }
          const resultText = finalLines.join('\n');
          const blob = new Blob([resultText], { type: "text/csv" });
          const previewFile = new File([blob], "preview_" + originalFile.name, {
            type: "text/csv"
          });
          resolve(previewFile);
        } else {
          readNextChunk();
        }
      };

      const readNextChunk = () => {
        const slice = originalFile.slice(offset, offset + CHUNK_SIZE);
        reader.readAsText(slice);
      };

      reader.onload = () => {
        offset += CHUNK_SIZE;
        textBuffer += reader.result;
        processLines();
      };

      reader.onerror = () => reject("❌ Error reading file.");

      readNextChunk(); // Start reading
    });
  };

  axios.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        alert("Authentication failed. Please check your credentials.");
      }
      return Promise.reject(err);
    }
  );

  const handleChange = (e) => {
    setProps({ ...props, [e.target.name]: e.target.value });
  };

  const fetchTables = async () => {
    try {
      const res = await axios.post(`${API_BASE}/tables`, props);
      setTables(res.data);
      setConnected(true);
      setMessage("✅ Connected Successfully.");
    } catch (err) {
      const msg = "❌ Failed to Connect. Please Check Credentials";
      setMessage("❌ " + msg);
    }
  };

  const fetchColumns = async () => {
    try {
      const res = await axios.post(`${API_BASE}/columns`, props, {
        params: { tableName: selectedTable }
      });
      setColumns(res.data);
      setMessage("✅ Columns loaded.");
    } catch (err) {
      const msg = err.response?.data || err.message || "❌ Failed to load columns.";
      setMessage("❌ " + msg);
      setColumns([]);
    }
  };

  const previewData = async () => {
    const liveSelected = Array.from(document.querySelectorAll('input[type="checkbox"][data-clickhouse-col]:checked'))
      .map(cb => cb.value);

    const payload = {
      tableName: selectedTable,
      columns: liveSelected,
      properties: props
    };

    try {
      const res = await axios.post(`${API_BASE}/preview`, payload);
      setPreviewRows(res.data);
      setSelectedCols(liveSelected); // update the state for modal
      setShowPreviewModal(true);
      setMessage("");
    } catch (err) {
      setMessage("❌ Preview failed: " + err.message);
    }
  };

  const ingestToFile = async () => {
    const payload = {
      tableName: selectedTable,
      columns: selectedCols,
      properties: props
    };

    try {
      setProgress(0);
      setMessage("⏬ Download started...");

      const res = await axios.post(`${API_BASE}/to-file`, payload, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total || null;

          const loadedMB = (loaded / (1024 * 1024)).toFixed(2);
          const totalMB = total ? (total / (1024 * 1024)).toFixed(2) : null;

          setMessage(totalMB
            ? `📥 Downloaded: ${loadedMB} MB / ${totalMB} MB`
            : `📥 Downloaded: ${loadedMB} MB`);

          if (total) {
            setProgress(Math.round((loaded * 100) / total));
          }
        }
      });

      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedTable}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setProgress(100);
      setMessage("✅ File downloaded successfully.");
      setTimeout(() => setProgress(0), 2000);
    } catch (err) {
      setProgress(0);
      setMessage("❌ Download failed: " + err.message);
    }
  };

  const ingestFromFile = async () => {
    const tableName = isNewTable ? newTableName : selectedTable;

    if (!tableName || !file) {
      setMessage("Please provide a table name and select a file.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tableName', tableName);
    formData.append('config', new Blob([JSON.stringify(props)], { type: 'application/json' }));
    formData.append('headers', new Blob([JSON.stringify(selectedCsvCols)], { type: 'application/json' }));

    if (isNewTable)
      formData.append('types', new Blob([JSON.stringify(selectedTypes)], { type: 'application/json' }));

    try {
      setProgress(0);
      setMessage("⏫ Upload started...");

      await axios.post(`${API_BASE}/from-file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const uploaded = progressEvent.loaded;
          const total = progressEvent.total || file.size;

          const uploadedMB = (uploaded / (1024 * 1024)).toFixed(2);
          const totalMB = (total / (1024 * 1024)).toFixed(2);

          const percent = Math.round((uploaded * 100) / total);
          setProgress(percent);
          setMessage(`📤 Uploaded: ${uploadedMB} MB / ${totalMB} MB`);
        }
      });

      setProgress(100);
      setMessage("✅ File uploaded and ingested into ClickHouse.");
      setTimeout(() => setProgress(0), 2000);
    } catch (err) {
      setProgress(0);
      setMessage("❌ Upload failed: " + err.message);
    }
  };


  return (
    <div className="container">
      <div style={{ padding: '20px' }}>
        <h2>ClickHouse ↔ File Ingestion Tool</h2>

        <h4>ClickHouse Connection</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select name="protocol" value={props.protocol} onChange={handleChange} style={{ width: '70px' }}>
            <option value="http">http</option>
            <option value="https">https</option>
          </select>
          <input
            type="text"
            name="host"
            placeholder="Host"
            value={props.host}
            onChange={handleChange}
          />
        </div>
        {['port', 'database', 'username', 'jwtToken', 'password', 'delimiter'].map(key => (
          <div key={key}>
            <label>{key}:</label>
            <input
              type={key.toLowerCase().includes('password') ? 'password' : 'text'}
              name={key}
              value={props[key]}
              onChange={handleChange}
            />
          </div>
        ))}


        <button onClick={fetchTables}>Connect</button>
        <select onChange={(e) => setSelectedTable(e.target.value)}>
          <option>Select a table</option>
          {tables.map((t) => <option key={t}>{t}</option>)}
        </select>

        <button onClick={fetchColumns}>Load Columns</button>
        <div>
          <h4>Select Columns</h4>
          {columns.map(col => (
            <label key={col}>
              <input
                type="checkbox"
                value={col}
                data-clickhouse-col // 👈 this helps target only ClickHouse checkboxes
                checked={selectedCols.includes(col)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCols(prev =>
                    prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
                  );
                }}
              />
              {col}
            </label>
          ))}


          <button onClick={previewData}>🔍 Preview First 100 Rows</button>

        </div>

        <button onClick={ingestToFile}>Ingest ClickHouse → File</button>

        <div>
          <h4>Upload File for Ingesting to ClickHouse</h4>

          <label>
            <input
              type="checkbox"
              checked={isNewTable}
              onChange={() => setIsNewTable(!isNewTable)}
            />{' '}
            Create new table
          </label>

          {isNewTable ? (
            <>
              <label>New Table Name</label>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Enter new table name"
              />
            </>
          ) : (
            <>
              <label>Select Existing Table</label>
              <select onChange={(e) => setSelectedTable(e.target.value)}>
                <option>Select table</option>
                {tables.map((t) => <option key={t}>{t}</option>)}
              </select>
            </>
          )}

          <input type="file" onChange={e => { setFile(e.target.files[0]); setCsvCols([]); setSelectedCsvCols([]); setSelectedTypes([]); }} />

          {csvCols.length > 0 && (
            <div>
              <h4>📝 Columns</h4>
              {csvCols.map(col => (
                <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedCsvCols.includes(col)}
                      onChange={() => setSelectedCsvCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                    /> {col}
                  </label>
                  {isNewTable && (
                    <select value={selectedTypes[col]} onChange={e => setSelectedTypes(prev => ({ ...prev, [col]: e.target.value }))}>
                      {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}

          <button onClick={loadCsvColumnsAndPreview}>🔍 Load + Preview CSV</button>
          <button onClick={ingestFromFile}>📤 Upload CSV to ClickHouse</button>
        </div>

        <div>
          <h4>Status</h4>
          <pre>{message}</pre>
        </div>

        {progress > 0 && progress < 100 && (
          <div style={{ marginTop: '10px' }}>
            <label>Download Progress: {progress}%</label>
            <div style={{
              width: '100%',
              backgroundColor: '#e9ecef',
              height: '10px',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#007bff'
              }}></div>
            </div>
          </div>
        )}
      </div>

      {showPreviewModalCSV && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '10px',
            width: '90%', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h3>📄 Preview (First {previewRows.length} Rows)</h3>
            <button onClick={() => setShowPreviewModalCSV(false)} style={{ float: 'right' }}>✖ Close</button>
            <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {selectedCsvCols.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    {selectedCsvCols.map((_, i) => (
                      <td key={i}>{row[i]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            maxHeight: '80vh',
            overflowY: 'auto',
            width: '90%',
            maxWidth: '1000px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <h3>📄 Preview (First {previewRows.length} Rows)</h3>
            <button onClick={() => setShowPreviewModal(false)}
              style={{ float: 'right', marginBottom: '10px' }}>✖ Close</button>
            <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {selectedCols.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    {row.map((cell, i) => <td key={i}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
