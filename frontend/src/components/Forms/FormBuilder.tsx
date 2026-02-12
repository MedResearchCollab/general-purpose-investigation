import React, { useState } from 'react';
import {
  Paper,
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface FormFieldDef {
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique_key?: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormBuilderProps {
  onSubmit: (formData: { name: string; description: string; schema_json: { fields: FormFieldDef[] } }) => void;
  initialData?: {
    name: string;
    description: string;
    schema_json: { fields: FormFieldDef[] };
  };
}

const fieldTypes = ['text', 'number', 'date', 'select', 'radio', 'checkbox', 'textarea'];

const FormBuilder: React.FC<FormBuilderProps> = ({ onSubmit, initialData }) => {
  const [formName, setFormName] = useState(initialData?.name || '');
  const [formDescription, setFormDescription] = useState(initialData?.description || '');
  const [fields, setFields] = useState<FormFieldDef[]>(initialData?.schema_json?.fields || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentField, setCurrentField] = useState<FormFieldDef>({
    name: '',
    label: '',
    type: 'text',
    required: false,
  });
  const [optionsInput, setOptionsInput] = useState<string>('');
  const [validationError, setValidationError] = useState('');

  const handleAddField = () => {
    setCurrentField({
      name: '',
      label: '',
      type: 'text',
      required: false,
    });
    setOptionsInput('');
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const handleEditField = (index: number) => {
    setCurrentField(fields[index]);
    setOptionsInput(fields[index].options?.join(', ') || '');
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!currentField.name || !currentField.label) {
      return;
    }

    // Process options from the input string
    const fieldToSave = { ...currentField };
    if ((currentField.type === 'select' || currentField.type === 'radio') && optionsInput.trim()) {
      fieldToSave.options = optionsInput.split(',').map((opt) => opt.trim()).filter(Boolean);
    } else if (currentField.type !== 'select' && currentField.type !== 'radio') {
      fieldToSave.options = undefined;
    }

    if (editingIndex !== null) {
      const newFields = [...fields];
      newFields[editingIndex] = fieldToSave;
      setFields(newFields);
    } else {
      setFields([...fields, fieldToSave]);
    }

    setDialogOpen(false);
    setEditingIndex(null);
    setOptionsInput('');
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formName || fields.length === 0) {
      return;
    }

    const hasUniqueKey = fields.some((field) => field.unique_key === true);
    if (!hasUniqueKey) {
      setValidationError('At least one field must be marked as Unique Key.');
      return;
    }

    setValidationError('');

    onSubmit({
      name: formName,
      description: formDescription,
      schema_json: { fields },
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Form Builder
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Form Name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          required
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Description"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          multiline
          rows={2}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddField}
        >
          Add Field
        </Button>
      </Box>

      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        If multiple fields are marked as Unique Key, they are enforced as a composed key combination.
      </Alert>

      <List>
        {fields.map((field, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={field.label}
              secondary={`${field.type} ${field.required ? '(required)' : ''}${field.unique_key ? ' (unique key)' : ''}`}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleEditField(index)}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" onClick={() => handleDeleteField(index)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {fields.length > 0 && (
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{ mt: 2 }}
          fullWidth
        >
          Save Form
        </Button>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? 'Edit Field' : 'Add Field'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Field Name (internal)"
              value={currentField.name}
              onChange={(e) => setCurrentField({ ...currentField, name: e.target.value })}
              required
              helperText="Use lowercase, no spaces (e.g., patient_name)"
            />
            <TextField
              label="Field Label"
              value={currentField.label}
              onChange={(e) => setCurrentField({ ...currentField, label: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select
                value={currentField.type}
                onChange={(e) => {
                  setCurrentField({ ...currentField, type: e.target.value, options: undefined });
                  if (e.target.value !== 'select' && e.target.value !== 'radio') {
                    setOptionsInput('');
                  }
                }}
                label="Field Type"
              >
                {fieldTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentField.required}
                  onChange={(e) => setCurrentField({ ...currentField, required: e.target.checked })}
                />
              }
              label="Required"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentField.unique_key || false}
                  onChange={(e) => setCurrentField({ ...currentField, unique_key: e.target.checked })}
                />
              }
              label="Unique Key (prevent duplicate records)"
            />
            {(currentField.type === 'select' || currentField.type === 'radio') && (
              <TextField
                label="Options (comma-separated)"
                value={optionsInput}
                onChange={(e) => setOptionsInput(e.target.value)}
                helperText="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)"
                fullWidth
              />
            )}
            <TextField
              label="Placeholder"
              value={currentField.placeholder || ''}
              onChange={(e) => setCurrentField({ ...currentField, placeholder: e.target.value })}
            />
            {currentField.type === 'number' && (
              <>
                <TextField
                  type="number"
                  label="Min Value"
                  value={currentField.validation?.min || ''}
                  onChange={(e) =>
                    setCurrentField({
                      ...currentField,
                      validation: {
                        ...currentField.validation,
                        min: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
                <TextField
                  type="number"
                  label="Max Value"
                  value={currentField.validation?.max || ''}
                  onChange={(e) =>
                    setCurrentField({
                      ...currentField,
                      validation: {
                        ...currentField.validation,
                        max: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveField} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default FormBuilder;

