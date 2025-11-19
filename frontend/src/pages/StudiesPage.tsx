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
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Study {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  forms?: Form[];
}

interface Form {
  id: number;
  name: string;
}

const StudiesPage: React.FC = () => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | ''>('');
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchStudies();
    fetchForms();
  }, []);

  const fetchStudies = async () => {
    try {
      const response = await api.get('/api/studies');
      const studiesData = await Promise.all(
        response.data.map(async (study: Study) => {
          const detailResponse = await api.get(`/api/studies/${study.id}`);
          return detailResponse.data;
        })
      );
      setStudies(studiesData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch studies');
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await api.get('/api/forms');
      setForms(response.data);
    } catch (err: any) {
      console.error('Failed to fetch forms:', err);
    }
  };

  const handleCreate = () => {
    setEditingStudy(null);
    setFormData({ name: '', description: '', is_active: true });
    setDialogOpen(true);
  };

  const handleEdit = (study: Study) => {
    setEditingStudy(study);
    setFormData({
      name: study.name,
      description: study.description || '',
      is_active: study.is_active,
    });
    setDialogOpen(true);
  };

  const handleAssignForm = (study: Study) => {
    setSelectedStudy(study);
    setSelectedFormId('');
    setAssignDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingStudy) {
        await api.put(`/api/studies/${editingStudy.id}`, formData);
      } else {
        await api.post('/api/studies', formData);
      }
      setDialogOpen(false);
      fetchStudies();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save study');
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedFormId || !selectedStudy) return;

    try {
      await api.post(`/api/studies/${selectedStudy.id}/forms/${selectedFormId}`);
      setAssignDialogOpen(false);
      fetchStudies();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign form');
    }
  };

  const handleRemoveForm = async (studyId: number, formId: number) => {
    try {
      await api.delete(`/api/studies/${studyId}/forms/${formId}`);
      fetchStudies();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove form');
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
        <Typography variant="h4">Studies</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Create Study
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
              <TableCell>Status</TableCell>
              <TableCell>Forms</TableCell>
              {isAdmin && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {studies.map((study) => (
              <TableRow key={study.id}>
                <TableCell>{study.name}</TableCell>
                <TableCell>{study.description || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={study.is_active ? 'Active' : 'Inactive'}
                    color={study.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {study.forms?.map((form) => (
                      <Chip
                        key={form.id}
                        label={form.name}
                        size="small"
                        onDelete={isAdmin ? () => handleRemoveForm(study.id, form.id) : undefined}
                      />
                    ))}
                    {isAdmin && (
                      <Button size="small" onClick={() => handleAssignForm(study)}>
                        + Add
                      </Button>
                    )}
                  </Box>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(study)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingStudy ? 'Edit Study' : 'Create Study'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
        <DialogTitle>Assign Form to Study</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Form</InputLabel>
            <Select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value as number)}
              label="Form"
            >
              {forms
                .filter((form) => !selectedStudy?.forms?.some((f) => f.id === form.id))
                .map((form) => (
                  <MenuItem key={form.id} value={form.id}>
                    {form.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignSubmit} variant="contained" disabled={!selectedFormId}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudiesPage;

