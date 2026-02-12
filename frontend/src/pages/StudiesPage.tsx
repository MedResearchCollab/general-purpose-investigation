import React, { useCallback, useEffect, useState } from 'react';
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
  title?: string;
  summary?: string;
  primary_coordinating_center?: string;
  principal_investigator_name?: string;
  principal_investigator_email?: string;
  sub_investigator_name?: string;
  sub_investigator_email?: string;
  general_objective?: string;
  specific_objectives?: string;
  inclusion_exclusion_criteria?: string;
  data_collection_deadline?: string;
  status: 'Data Collection' | 'Analysis' | 'Closed' | 'Canceled';
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
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    primary_coordinating_center: '',
    principal_investigator_name: '',
    principal_investigator_email: '',
    sub_investigator_name: '',
    sub_investigator_email: '',
    general_objective: '',
    specific_objectives: '',
    inclusion_exclusion_criteria: '',
    data_collection_deadline: '',
    status: 'Data Collection' as Study['status'],
  });
  const [error, setError] = useState('');
  const [showClosedCanceled, setShowClosedCanceled] = useState(false);
  const { isAdmin } = useAuth();

  const fetchStudies = useCallback(async () => {
    try {
      const params = showClosedCanceled ? { include_closed_canceled: true } : {};
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
              status: study.status || 'Data Collection',
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
  }, [showClosedCanceled]);

  const fetchForms = useCallback(async () => {
    try {
      const response = await api.get('/api/forms');
      setForms(response.data);
    } catch (err: any) {
      console.error('Failed to fetch forms:', err);
    }
  }, []);

  useEffect(() => {
    fetchStudies();
    fetchForms();
  }, [fetchStudies, fetchForms]);

  const handleCreate = () => {
    setEditingStudy(null);
    setFormData({
      title: '',
      summary: '',
      primary_coordinating_center: '',
      principal_investigator_name: '',
      principal_investigator_email: '',
      sub_investigator_name: '',
      sub_investigator_email: '',
      general_objective: '',
      specific_objectives: '',
      inclusion_exclusion_criteria: '',
      data_collection_deadline: '',
      status: 'Data Collection',
    });
    setDialogOpen(true);
  };

  const handleEdit = (study: Study) => {
    setEditingStudy(study);
    setFormData({
      title: study.title || study.name || '',
      summary: study.summary || study.description || '',
      primary_coordinating_center: study.primary_coordinating_center || '',
      principal_investigator_name: study.principal_investigator_name || '',
      principal_investigator_email: study.principal_investigator_email || '',
      sub_investigator_name: study.sub_investigator_name || '',
      sub_investigator_email: study.sub_investigator_email || '',
      general_objective: study.general_objective || '',
      specific_objectives: study.specific_objectives || '',
      inclusion_exclusion_criteria: study.inclusion_exclusion_criteria || '',
      data_collection_deadline: study.data_collection_deadline || '',
      status: study.status || 'Data Collection',
    });
    setDialogOpen(true);
  };

  const handleAssignForm = (study: Study) => {
    setSelectedStudy(study);
    setSelectedFormId('');
    setAssignDialogOpen(true);
  };

  const handleSubmit = async () => {
    const title = formData.title.trim();
    const payload = {
      ...formData,
      name: title,
      description: formData.summary.trim() || null,
      title,
      summary: formData.summary.trim() || null,
      primary_coordinating_center: formData.primary_coordinating_center.trim() || null,
      principal_investigator_name: formData.principal_investigator_name.trim() || null,
      principal_investigator_email: formData.principal_investigator_email.trim() || null,
      sub_investigator_name: formData.sub_investigator_name.trim() || null,
      sub_investigator_email: formData.sub_investigator_email.trim() || null,
      general_objective: formData.general_objective.trim() || null,
      specific_objectives: formData.specific_objectives.trim() || null,
      inclusion_exclusion_criteria: formData.inclusion_exclusion_criteria.trim() || null,
      data_collection_deadline: formData.data_collection_deadline || null,
    };

    if (!title) {
      setError('Title is required');
      return;
    }

    try {
      if (editingStudy) {
        await api.put(`/api/studies/${editingStudy.id}`, payload);
      } else {
        await api.post('/api/studies', payload);
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

  const updateStudyStatus = async (studyId: number, nextStatus: Study['status']) => {
    try {
      await api.put(`/api/studies/${studyId}`, { status: nextStatus });
      fetchStudies();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update study status');
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
                variant={showClosedCanceled ? 'outlined' : 'contained'}
                onClick={() => setShowClosedCanceled(!showClosedCanceled)}
              >
                {showClosedCanceled ? 'Hide Closed/Canceled' : 'Show Closed/Canceled'}
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
              <TableCell>Primary Center</TableCell>
              <TableCell>Principal Investigator</TableCell>
              <TableCell>Sub-Investigator</TableCell>
              <TableCell>Objectives</TableCell>
              <TableCell>Inclusion/Exclusion Criteria</TableCell>
              <TableCell>Data Collection Deadline</TableCell>
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
                  opacity: (study.status === 'Closed' || study.status === 'Canceled') ? 0.7 : 1,
                  backgroundColor: (study.status === 'Closed' || study.status === 'Canceled') ? 'action.hover' : 'inherit',
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {study.title || study.name}
                  </Box>
                </TableCell>
                <TableCell>{study.summary || study.description || '-'}</TableCell>
                <TableCell>{study.primary_coordinating_center || '-'}</TableCell>
                <TableCell>
                  {study.principal_investigator_name || study.principal_investigator_email
                    ? `${study.principal_investigator_name || '-'}${study.principal_investigator_email ? ` (${study.principal_investigator_email})` : ''}`
                    : '-'}
                </TableCell>
                <TableCell>
                  {study.sub_investigator_name || study.sub_investigator_email
                    ? `${study.sub_investigator_name || '-'}${study.sub_investigator_email ? ` (${study.sub_investigator_email})` : ''}`
                    : '-'}
                </TableCell>
                <TableCell>
                  {(study.general_objective || study.specific_objectives)
                    ? `${study.general_objective || '-'}${study.specific_objectives ? ` | ${study.specific_objectives}` : ''}`
                    : '-'}
                </TableCell>
                <TableCell>{study.inclusion_exclusion_criteria || '-'}</TableCell>
                <TableCell>{study.data_collection_deadline || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={study.status}
                    color={
                      study.status === 'Data Collection'
                        ? 'success'
                        : study.status === 'Analysis'
                          ? 'info'
                          : study.status === 'Closed'
                            ? 'default'
                            : 'warning'
                    }
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
                        onDelete={isAdmin && study.status !== 'Closed' && study.status !== 'Canceled' ? () => handleRemoveForm(study.id, form.id) : undefined}
                      />
                    ))}
                    {isAdmin && study.status !== 'Closed' && study.status !== 'Canceled' && (
                      <Button size="small" onClick={() => handleAssignForm(study)}>
                        + Add
                      </Button>
                    )}
                  </Box>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleEdit(study)}>
                        <EditIcon />
                      </IconButton>
                      {study.status !== 'Closed' && (
                        <Button size="small" onClick={() => updateStudyStatus(study.id, 'Closed')}>
                          Close
                        </Button>
                      )}
                      {study.status !== 'Canceled' && (
                        <Button size="small" color="warning" onClick={() => updateStudyStatus(study.id, 'Canceled')}>
                          Cancel
                        </Button>
                      )}
                      {study.status !== 'Data Collection' && (
                        <Button size="small" onClick={() => updateStudyStatus(study.id, 'Data Collection')}>
                          Set Data Collection
                        </Button>
                      )}
                      {study.status !== 'Analysis' && (
                        <Button size="small" onClick={() => updateStudyStatus(study.id, 'Analysis')}>
                          Set Analysis
                        </Button>
                      )}
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteClick(study)}
                        color="error"
                        title="Delete study"
                      >
                        <DeleteIcon />
                      </IconButton>
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
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Primary Coordinating Center"
              value={formData.primary_coordinating_center}
              onChange={(e) => setFormData({ ...formData, primary_coordinating_center: e.target.value })}
              fullWidth
            />
            <TextField
              label="Principal Investigator"
              value={formData.principal_investigator_name}
              onChange={(e) => setFormData({ ...formData, principal_investigator_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Principal Investigator Email"
              type="email"
              value={formData.principal_investigator_email}
              onChange={(e) => setFormData({ ...formData, principal_investigator_email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Sub-Investigator"
              value={formData.sub_investigator_name}
              onChange={(e) => setFormData({ ...formData, sub_investigator_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Sub-Investigator Email"
              type="email"
              value={formData.sub_investigator_email}
              onChange={(e) => setFormData({ ...formData, sub_investigator_email: e.target.value })}
              fullWidth
            />
            <TextField
              label="General Objective"
              value={formData.general_objective}
              onChange={(e) => setFormData({ ...formData, general_objective: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Specific Objectives"
              value={formData.specific_objectives}
              onChange={(e) => setFormData({ ...formData, specific_objectives: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Inclusion and Exclusion Criteria"
              value={formData.inclusion_exclusion_criteria}
              onChange={(e) => setFormData({ ...formData, inclusion_exclusion_criteria: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Data Collection Deadline"
              type="date"
              value={formData.data_collection_deadline}
              onChange={(e) => setFormData({ ...formData, data_collection_deadline: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Study['status'] })}
                label="Status"
              >
                <MenuItem value="Data Collection">Data Collection</MenuItem>
                <MenuItem value="Analysis">Analysis</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
                <MenuItem value="Canceled">Canceled</MenuItem>
              </Select>
            </FormControl>
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
            Are you sure you want to delete the study "{studyToDelete?.title || studyToDelete?.name}"? 
            This action cannot be undone.
            {studyToDelete && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning">
                  Note: Studies with submissions cannot be deleted. Set status to Closed or Canceled instead.
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

