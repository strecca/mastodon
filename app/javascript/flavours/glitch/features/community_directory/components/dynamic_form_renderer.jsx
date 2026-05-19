// app/javascript/flavours/glitch/features/community_directory/admin/index.jsx
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createCategory } from '../../../actions/community_directory';
import { useHistory } from 'react-router-dom';

const CommunityDirectoryAdmin = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [categoryName, setCategoryName] = useState('');
  const [step, setStep] = useState(1); // 1 = name, 2 = field builder
  const [fields, setFields] = useState([]); // Array of field definitions
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);

  const [newField, setNewField] = useState({
    db_name: '',
    label: '',
    type: 'string',
    widget: 'text',
    required: false,
    options: ''
  });

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setCreating(true);
    try {
      await dispatch(createCategory(categoryName.trim()));
      setStatus(`✅ Category "${categoryName}" created. Now define fields.`);
      setStep(2);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const addField = () => {
    if (!newField.db_name) return;
    setFields([...fields, { ...newField }]);
    setNewField({ db_name: '', label: '', type: 'string', widget: 'text', required: false, options: '' });
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const saveSchema = () => {
    // TODO: Call backend to save YAML + generate migration
    alert(`Schema for "${categoryName}" saved with ${fields.length} fields.\n\nYAML file would be created here.`);
    history.push(`/directories/${categoryName}`);
  };

  return (
    <div className="status">
      <h1>🛠️ Community Directory Admin</h1>

      {step === 1 && (
        <div>
          <h2>Step 1: Create Category</h2>
          <form onSubmit={handleCreateCategory}>
            <div className="field mb-4">
              <label>Category Name (singular, lowercase)</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value.toLowerCase().trim())}
                placeholder="artists"
                className="search__input w-100"
                disabled={creating}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={creating || !categoryName}>
              {creating ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Step 2: Build Fields for "{categoryName}"</h2>
          <p className="lead">Define the fields that will appear in forms and the database table.</p>

          {/* Add New Field */}
          <div className="status mb-4">
            <h4>Add New Field</h4>
            <div className="d-flex gap-3 flex-wrap">
              <input placeholder="db_name (e.g. full_name)" value={newField.db_name} onChange={e => setNewField({...newField, db_name: e.target.value})} className="search__input" style={{width: '180px'}} />
              <input placeholder="Label" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} className="search__input" style={{width: '180px'}} />
              <select value={newField.widget} onChange={e => setNewField({...newField, widget: e.target.value})} className="search__input">
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="checkboxes">Checkboxes</option>
                <option value="date">Date</option>
              </select>
              <label><input type="checkbox" checked={newField.required} onChange={e => setNewField({...newField, required: e.target.checked})} /> Required</label>
              <button onClick={addField} className="btn btn-primary">Add Field</button>
            </div>
          </div>

          {/* Current Fields List */}
          <h4>Defined Fields ({fields.length})</h4>
          {fields.length > 0 ? (
            fields.map((field, index) => (
              <div key={index} className="status d-flex justify-content-between align-items-center mb-2">
                <div>
                  <strong>{field.db_name}</strong> — {field.label} 
                  <small className="text-muted ms-2">({field.widget}{field.required ? ', required' : ''})</small>
                </div>
                <button onClick={() => removeField(index)} className="btn btn-danger btn-sm">Remove</button>
              </div>
            ))
          ) : (
            <p className="text-muted">No fields defined yet.</p>
          )}

          <div className="mt-5">
            <button onClick={saveSchema} className="btn btn-success btn-block" disabled={fields.length === 0}>
              Save Schema & Generate Files
            </button>
          </div>
        </div>
      )}

      {status && <div className={`status mt-4 ${status.includes('✅') ? 'success' : 'error'}`}>{status}</div>}
    </div>
  );
};

export default CommunityDirectoryAdmin;