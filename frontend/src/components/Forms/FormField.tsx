import React from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  FormHelperText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface FormFieldProps {
  field: {
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
  };
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({ field, value, onChange, error }) => {
  const handleChange = (newValue: any) => {
    onChange(newValue);
  };

  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <TextField
          fullWidth
          label={field.label}
          name={field.name}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          multiline={field.type === 'textarea'}
          rows={field.type === 'textarea' ? 4 : 1}
          error={!!error}
          helperText={error}
        />
      );

    case 'number':
      return (
        <TextField
          fullWidth
          type="number"
          label={field.label}
          name={field.name}
          value={value || ''}
          onChange={(e) => handleChange(Number(e.target.value))}
          required={field.required}
          placeholder={field.placeholder}
          inputProps={{
            min: field.validation?.min,
            max: field.validation?.max,
          }}
          error={!!error}
          helperText={error}
        />
      );

    case 'date':
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={field.label}
            value={value || null}
            onChange={(newValue) => handleChange(newValue)}
            slotProps={{
              textField: {
                fullWidth: true,
                required: field.required,
                error: !!error,
                helperText: error,
              },
            }}
          />
        </LocalizationProvider>
      );

    case 'select':
      return (
        <FormControl fullWidth required={field.required} error={!!error}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            label={field.label}
          >
            {field.options?.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );

    case 'radio':
      return (
        <FormControl component="fieldset" required={field.required} error={!!error}>
          <FormLabel component="legend">{field.label}</FormLabel>
          <RadioGroup
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          >
            {field.options?.map((option) => (
              <FormControlLabel
                key={option}
                value={option}
                control={<Radio />}
                label={option}
              />
            ))}
          </RadioGroup>
          {error && <FormHelperText error>{error}</FormHelperText>}
        </FormControl>
      );

    case 'checkbox':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={value || false}
              onChange={(e) => handleChange(e.target.checked)}
            />
          }
          label={field.label}
        />
      );

    default:
      return (
        <TextField
          fullWidth
          label={field.label}
          name={field.name}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          required={field.required}
          error={!!error}
          helperText={error}
        />
      );
  }
};

export default FormField;

