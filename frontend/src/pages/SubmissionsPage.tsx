import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FormRenderer from '../components/Forms/FormRenderer';

interface Submission {
  id: number;
  form_id: number;
  study_id: number;
  user_id: number;
  data_json: Record<string, any>;
  created_at: string;
  updated_at: string | null;
}

interface Study {
  id: number;
  name: string;
  is_active?: boolean;
  forms?: Form[];
}

interface Form {
  id: number;
  name: string;
  schema_json: {
    fields: any[];
  };
}

const SubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<number | ''>('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [error, setError] = useState('');
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchSubmissions();
    fetchStudies();
    fetchForms();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await api.get('/api/submissions');
      setSubmissions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudies = async () => {
    try {
      const response = await api.get('/api/studies');
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
            };
          }
        })
      );
      
      // Extract successful results - show all studies (including inactive ones) for submission creation
      const successfulStudies = studiesData
        .map((result) => (result.status === 'fulfilled' ? result.value : null))
        .filter((s): s is Study => s !== null);
      
      setStudies(successfulStudies);
    } catch (err: any) {
      console.error('Failed to fetch studies:', err);
      setError(err.response?.data?.detail || 'Failed to fetch studies');
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

  const handleCreateSubmission = (studyId: number, formId: number) => {
    const form = forms.find((f) => f.id === formId);
    if (form) {
      setSelectedForm(form);
      setSelectedStudy(studyId);
      setSubmissionDialogOpen(true);
    }
  };

  const handleSubmitForm = async (data: Record<string, any>) => {
    if (!selectedForm || !selectedStudy) return;

    try {
      await api.post('/api/submissions', {
        form_id: selectedForm.id,
        study_id: selectedStudy,
        data_json: data,
      });
      setSubmissionDialogOpen(false);
      setSelectedForm(null);
      setSelectedStudy('');
      fetchSubmissions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit form');
    }
  };

  const refreshStudyDetails = async (studyId: number) => {
    try {
      const detailResponse = await api.get(`/api/studies/${studyId}`);
      const updatedStudy = detailResponse.data;
      setStudies((prevStudies) =>
        prevStudies.map((s) => (s.id === studyId ? updatedStudy : s))
      );
    } catch (err: any) {
      console.error(`Failed to refresh study ${studyId} details:`, err);
    }
  };

  const getAvailableForms = () => {
    if (!selectedStudy) return [];
    const study = studies.find((s) => s.id === selectedStudy);
    return study?.forms || [];
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
      <Typography variant="h4" gutterBottom>
        Submissions
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Create New Submission
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Study</InputLabel>
            <Select
              value={selectedStudy}
              onChange={async (e) => {
                const studyId = e.target.value as number;
                setSelectedStudy(studyId);
                setSelectedForm(null);
                // Refresh study details to get latest forms
                await refreshStudyDetails(studyId);
              }}
              label="Study"
            >
              {studies.map((study) => (
                <MenuItem key={study.id} value={study.id}>
                  {study.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedStudy && (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Form</InputLabel>
              <Select
                value={selectedForm?.id || ''}
                onChange={(e) => {
                  const form = getAvailableForms().find((f) => f.id === e.target.value);
                  setSelectedForm(form || null);
                }}
                label="Form"
                disabled={getAvailableForms().length === 0}
              >
                {getAvailableForms().length > 0 ? (
                  getAvailableForms().map((form) => (
                    <MenuItem key={form.id} value={form.id}>
                      {form.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled value="">
                    No forms assigned
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          )}
          {selectedStudy && getAvailableForms().length === 0 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              No forms are assigned to this study. Please assign a form to this study on the Studies page first.
            </Alert>
          )}
          {selectedForm && selectedStudy && (
            <Button
              variant="contained"
              onClick={() => handleCreateSubmission(selectedStudy as number, selectedForm.id)}
            >
              Fill Form
            </Button>
          )}
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Study</TableCell>
              <TableCell>Form</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((submission) => {
              const study = studies.find((s) => s.id === submission.study_id);
              const form = forms.find((f) => f.id === submission.form_id);
              return (
                <TableRow key={submission.id}>
                  <TableCell>{submission.id}</TableCell>
                  <TableCell>{study?.name || submission.study_id}</TableCell>
                  <TableCell>{form?.name || submission.form_id}</TableCell>
                  <TableCell>{new Date(submission.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedForm(form || null);
                        setSubmissionDialogOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={submissionDialogOpen}
        onClose={() => {
          setSubmissionDialogOpen(false);
          setSelectedForm(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedForm ? `Fill Form: ${selectedForm.name}` : 'View Submission'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedForm && (
            <FormRenderer
              schema={selectedForm.schema_json}
              onSubmit={handleSubmitForm}
              submitLabel="Submit"
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default SubmissionsPage;

