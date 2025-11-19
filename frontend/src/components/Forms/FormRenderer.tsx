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
    if (field.required && (value === null || value === undefined || value === '')) {
      return `${field.label} is required`;
    }

    if (field.type === 'number' && value !== null && value !== undefined && value !== '') {
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

    if (field.type === 'text' && field.validation?.pattern && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return `${field.label} format is invalid`;
      }
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
      return;
    }

    onSubmit(formData);
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

