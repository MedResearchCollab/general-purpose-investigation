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
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Study {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_archived?: boolean;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [studyToDelete, setStudyToDelete] = useState<Study | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | ''>('');
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchStudies();
    fetchForms();
  }, [showArchived]);

  const fetchStudies = async () => {
    try {
      const params = showArchived ? { include_archived: true } : {};
      const response = await api.get('/api/studies', { params });
      // Fetch full details for each study (with forms) but handle errors gracefully
      const studiesData = await Promise.allSettled(
        response.data.map(async (study: Study) => {
          try {
            const detailResponse = await api.get(`/api/studies/${study.id}`);
            return detailResponse.data;
          } catch (err: any) {
            // If detail fetch fails, return the basic study data
            console.warn(`Failed to fetch details for study ${study.id}:`, err);
            return {
              ...study,
              forms: [],
              is_active: study.is_active ?? true,
              is_archived: study.is_archived ?? false,
            };
          }
        })
      );
      
      // Extract successful results
      const successfulStudies = studiesData
        .map((result) => (result.status === 'fulfilled' ? result.value : null))
        .filter((s): s is Study => s !== null);
      
      setStudies(successfulStudies);
    } catch (err: any) {
      console.error('Failed to fetch studies:', err);
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

  const handleArchive = async (studyId: number) => {
    try {
      await api.post(`/api/studies/${studyId}/archive`);
      fetchStudies();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to archive study');
    }
  };

  const handleUnarchive = async (studyId: number) => {
    try {
      await api.post(`/api/studies/${studyId}/unarchive`);
      fetchStudies();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to unarchive study');
    }
  };

  const handleDeleteClick = (study: Study) => {
    setStudyToDelete(study);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studyToDelete) return;

    try {
      await api.delete(`/api/studies/${studyToDelete.id}`);
      setDeleteDialogOpen(false);
      setStudyToDelete(null);
      fetchStudies();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete study');
      setDeleteDialogOpen(false);
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {isAdmin && (
            <>
              <Button
                variant={showArchived ? 'outlined' : 'contained'}
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
                Create Study
              </Button>
            </>
          )}
        </Box>
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
              <TableRow 
                key={study.id}
                sx={{
                  opacity: (study.is_archived ?? false) ? 0.6 : 1,
                  backgroundColor: (study.is_archived ?? false) ? 'action.hover' : 'inherit',
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {study.name}
                    {(study.is_archived ?? false) && (
                      <Chip
                        label="Archived"
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>
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
                        onDelete={isAdmin && !(study.is_archived ?? false) ? () => handleRemoveForm(study.id, form.id) : undefined}
                      />
                    ))}
                    {isAdmin && !(study.is_archived ?? false) && (
                      <Button size="small" onClick={() => handleAssignForm(study)}>
                        + Add
                      </Button>
                    )}
                  </Box>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {!(study.is_archived ?? false) && (
                        <>
                          <IconButton size="small" onClick={() => handleEdit(study)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleArchive(study.id)}
                            color="default"
                            title="Archive study"
                          >
                            <ArchiveIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteClick(study)}
                            color="error"
                            title="Delete study"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                      {(study.is_archived ?? false) && (
                        <>
                          <IconButton 
                            size="small" 
                            onClick={() => handleUnarchive(study.id)}
                            color="primary"
                            title="Unarchive study"
                          >
                            <UnarchiveIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteClick(study)}
                            color="error"
                            title="Delete study"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Study</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the study "{studyToDelete?.name}"? 
            This action cannot be undone.
            {studyToDelete && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning">
                  Note: Studies with submissions cannot be deleted. They must be archived instead.
                </Alert>
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudiesPage;

