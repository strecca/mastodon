import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchResources, createResource } from '../../../actions/community_directory';
import DynamicFormRenderer from '../components/dynamic_form_renderer';
import { useHistory } from 'react-router-dom';

const CommunityDirectoryNew = ({ match }) => {
  const { category } = match.params || {};
  const dispatch = useDispatch();
  const history = useHistory();

  const formConfig = useSelector(state => state.getIn(['community_directory', 'formConfig'], {}));
  const loading = useSelector(state => state.getIn(['community_directory', 'loading'], false));
  const error = useSelector(state => state.getIn(['community_directory', 'error']));

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load form configuration when category changes
  useEffect(() => {
    if (category) {
      dispatch(fetchResources(category)); // This should load formConfig as well
    }
  }, [dispatch, category]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const fields = formConfig.get('fields') || [];

    fields.forEach(field => {
      const name = field.get('db_name');
      const required = field.get('required') || false;
      const value = formData[name];

      if (required) {
        if (Array.isArray(value)) {
          if (value.length === 0) errors[name] = 'This field is required';
        } else if (!value || String(value).trim() === '') {
          errors[name] = 'This field is required';
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    dispatch(createResource(category, formData))
      .then(() => {
        setSubmitSuccess(true);
        setTimeout(() => {
          history.push(`/directories/${category}`); // Return to category list
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to create resource:', err);
      });
  };

  if (error) return <div className="status error">Error: {error}</div>;
  if (!category) return <div className="status error">Category not specified.</div>;

  return (
    <div className="community-directory-new">
      <h1>Add New {category.humanize?.() || category} Entry</h1>
      <p className="lead">Fill out the form below to contribute to the directory.</p>

      {submitSuccess && (
        <div className="status success mb-4">
          ✅ Entry submitted successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <DynamicFormRenderer 
          formConfig={formConfig} 
          formData={formData} 
          onChange={handleChange}
          errors={formErrors}
        />

        <div className="mt-5">
          <button 
            type="submit" 
            className="btn btn-success btn-block"
            disabled={loading}
          >
            {loading ? 'Submitting...' : `Add to ${category.humanize?.() || category}`}
          </button>
        </div>
      </form>

      <div className="mt-4">
        <a href={`/directories/${category}`} className="btn btn-link">
          ← Back to {category.humanize?.() || category} Directory
        </a>
      </div>
    </div>
  );
};

export default CommunityDirectoryNew;