import React, { useState } from 'react';
import {
  Paper,
  Box,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import FormField from './FormField';

interface FormFieldDef {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormRendererProps {
  schema: {
    fields: FormFieldDef[];
  };
  onSubmit: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
  submitLabel?: string;
}

const FormRenderer: React.FC<FormRendererProps> = ({
  schema,
  onSubmit,
  initialData = {},
  submitLabel = 'Submit',
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: FormFieldDef, value: any): string | null => {
    // For checkboxes, false is a valid value (not required means it can be false)
    if (field.type === 'checkbox') {
      if (field.required && value !== true) {
        return `${field.label} is required`;
      }
      return null;
    }

    // For other fields, check if required
    if (field.required && (value === null || value === undefined || value === '')) {
      return `${field.label} is required`;
    }

    // Skip validation if field is empty and not required
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (field.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        return `${field.label} must be a number`;
      }
      if (field.validation?.min !== undefined && num < field.validation.min) {
        return `${field.label} must be at least ${field.validation.min}`;
      }
      if (field.validation?.max !== undefined && num > field.validation.max) {
        return `${field.label} must be at most ${field.validation.max}`;
      }
    }

    if (field.type === 'text' && field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return `${field.label} format is invalid`;
      }
    }

    if (field.type === 'date' && value instanceof Date && isNaN(value.getTime())) {
      return `${field.label} is not a valid date`;
    }

    return null;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const formatDataForSubmission = (data: Record<string, any>): Record<string, any> => {
    const formatted: Record<string, any> = {};
    
    Object.keys(data).forEach((key) => {
      const value = data[key];
      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        formatted[key] = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else {
        formatted[key] = value;
      }
    });
    
    return formatted;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    schema.fields.forEach((field) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Format data before submission (especially dates)
    const formattedData = formatDataForSubmission(formData);
    onSubmit(formattedData);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {schema.fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={(value) => handleFieldChange(field.name, value)}
              error={errors[field.name]}
            />
          ))}
          <Button type="submit" variant="contained" size="large">
            {submitLabel}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default FormRenderer;

