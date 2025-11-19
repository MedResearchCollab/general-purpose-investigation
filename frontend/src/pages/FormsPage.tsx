import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FormBuilder from '../components/Forms/FormBuilder';

interface Form {
  id: number;
  name: string;
  description: string;
  schema_json: {
    fields: any[];
  };
  created_at: string;
}

const FormsPage: React.FC = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await api.get('/api/forms');
      setForms(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingForm(null);
    setDialogOpen(true);
  };

  const handleEdit = (form: Form) => {
    setEditingForm(form);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      await api.delete(`/api/forms/${id}`);
      fetchForms();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete form');
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (editingForm) {
        await api.put(`/api/forms/${editingForm.id}`, formData);
      } else {
        await api.post('/api/forms', formData);
      }
      setDialogOpen(false);
      fetchForms();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save form');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Forms</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Create Form
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Fields</TableCell>
              <TableCell>Created</TableCell>
              {isAdmin && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {forms.map((form) => (
              <TableRow key={form.id}>
                <TableCell>{form.name}</TableCell>
                <TableCell>{form.description || '-'}</TableCell>
                <TableCell>{form.schema_json?.fields?.length || 0}</TableCell>
                <TableCell>{new Date(form.created_at).toLocaleDateString()}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(form)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(form.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingForm ? 'Edit Form' : 'Create Form'}</DialogTitle>
        <DialogContent>
          <FormBuilder
            onSubmit={handleSubmit}
            initialData={editingForm ? {
              name: editingForm.name,
              description: editingForm.description,
              schema_json: editingForm.schema_json,
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default FormsPage;

