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
  TextField as MuiTextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface FormFieldDef {
  name: string;
  label: string;
  type: string;
  required: boolean;
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

  const handleAddField = () => {
    setCurrentField({
      name: '',
      label: '',
      type: 'text',
      required: false,
    });
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const handleEditField = (index: number) => {
    setCurrentField(fields[index]);
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!currentField.name || !currentField.label) {
      return;
    }

    if (editingIndex !== null) {
      const newFields = [...fields];
      newFields[editingIndex] = currentField;
      setFields(newFields);
    } else {
      setFields([...fields, currentField]);
    }

    setDialogOpen(false);
    setEditingIndex(null);
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formName || fields.length === 0) {
      return;
    }

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

      <List>
        {fields.map((field, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={field.label}
              secondary={`${field.type} ${field.required ? '(required)' : ''}`}
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
                onChange={(e) => setCurrentField({ ...currentField, type: e.target.value, options: undefined })}
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
            {(currentField.type === 'select' || currentField.type === 'radio') && (
              <TextField
                label="Options (comma-separated)"
                value={currentField.options?.join(', ') || ''}
                onChange={(e) =>
                  setCurrentField({
                    ...currentField,
                    options: e.target.value.split(',').map((opt) => opt.trim()).filter(Boolean),
                  })
                }
                helperText="Enter options separated by commas"
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

