// App.js
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:8080/api/ingestion';

function App() {
  const [props, setProps] = useState({
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

  const handleChange = (e) => {
    setProps({ ...props, [e.target.name]: e.target.value });
  };

  const fetchTables = async () => {
    const res = await axios.post(`${API_BASE}/tables`, props);
    setTables(res.data);
  };

  const fetchColumns = async () => {
    const res = await axios.post(`${API_BASE}/columns`, props, {
      params: { tableName: selectedTable }
    });
    setColumns(res.data);
  };

  const ingestToFile = async () => {
    const payload = {
      tableName: selectedTable,
      columns: selectedCols,
      properties: props
    };
  
    try {
      const res = await axios.post(`${API_BASE}/to-file`, payload, {
        responseType: 'blob'  // Important for file download
      });
  
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
  
      link.href = url;
      link.setAttribute('download', `${selectedTable}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
  
      setMessage("File downloaded successfully.");
    } catch (err) {
      setMessage("Download failed: " + err.message);
    }
  };  
  
  const ingestFromFile = async () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tableName', selectedTable);
    formData.append('config', new Blob([JSON.stringify(props)], { type: 'application/json' }));
  
    try {
      const res = await axios.post(`${API_BASE}/from-file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage(res.data);
    } catch (err) {
      setMessage("Upload failed: " + err.message);
    }
  };  

  return (
    <div className="container">
    <div style={{ padding: '20px' }}>
      <h2>ClickHouse ↔ File Ingestion Tool</h2>

      <h4>ClickHouse Connection</h4>
      {Object.keys(props).map((key) => (
        <div key={key}>
          <label>{key}:</label>
          <input
            type="text"
            name={key}
            value={props[key]}
            onChange={handleChange}
          />
        </div>
      ))}

      <button onClick={fetchTables}>Load Tables</button>
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
      </div>

      <button onClick={ingestToFile}>Ingest ClickHouse → File</button>

      <div>
        <h4>Upload File for Ingesting to ClickHouse</h4>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={ingestFromFile}>Upload</button>
      </div>

      <div>
        <h4>Status</h4>
        <pre>{message}</pre>
      </div>
    </div>
    </div>
  );
}

export default App;
