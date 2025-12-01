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
} from '@mui/material';
import api from '../services/api';
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

  const getErrorMessage = (err: any): string => {
    // Check for network errors (no response from server)
    if (!err.response) {
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || err.message?.includes('Network Error')) {
        return 'Network Error: Cannot connect to the backend server. Please ensure the backend is running on http://localhost:8000';
      }
      if (err.code === 'ECONNREFUSED') {
        return 'Connection Refused: The backend server is not running or not accessible at http://localhost:8000';
      }
      if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        return 'Request Timeout: The backend server is taking too long to respond. Please check if it is running.';
      }
      return `Network Error: ${err.message || 'Cannot connect to the backend server. Please ensure the backend is running on http://localhost:8000'}`;
    }
    // Check for server errors (response received but with error status)
    if (err.response?.data?.detail) {
      return err.response.data.detail;
    }
    if (err.response?.status) {
      return `Server Error (${err.response.status}): ${err.response.statusText || 'An error occurred on the server'}`;
    }
    // Generic error
    return err.message || 'An unexpected error occurred';
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(''); // Clear any previous errors
      try {
        // First, test backend connectivity
        try {
          await api.get('/');
        } catch (connectErr: any) {
          // If root endpoint fails, it's likely a network/CORS issue
          if (!connectErr.response) {
            const errorMessage = getErrorMessage(connectErr);
            setError(errorMessage);
            setLoading(false);
            return;
          }
        }
        
        // Fetch all data in parallel
        await Promise.allSettled([
          fetchSubmissions(),
          fetchStudies(),
          fetchForms(),
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await api.get('/api/submissions');
      setSubmissions(response.data);
      // Clear error on success
      setError('');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Failed to fetch submissions:', {
        error: err,
        message: err.message,
        code: err.code,
        response: err.response,
        config: err.config,
      });
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
      // Clear error on success
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch studies:', {
        error: err,
        message: err.message,
        code: err.code,
        response: err.response,
        config: err.config,
      });
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await api.get('/api/forms');
      setForms(response.data);
    } catch (err: any) {
      console.error('Failed to fetch forms:', err);
      // Don't set error for forms fetch failure as it's not critical for the page
      // The main error will be shown from fetchSubmissions or fetchStudies
    }
  };

  const handleCreateSubmission = (studyId: number, formId: number) => {
    // Use the form from the study's forms list, or fall back to the forms array
    const study = studies.find((s) => s.id === studyId);
    const form = study?.forms?.find((f) => f.id === formId) || forms.find((f) => f.id === formId);
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
      setError(''); // Clear any previous errors
      fetchSubmissions();
    } catch (err: any) {
      console.error('Submission error:', {
        error: err,
        message: err.message,
        code: err.code,
        response: err.response,
        config: err.config,
      });
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      // Keep dialog open so user can see the error and try again
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
          setError(''); // Clear error when closing
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedForm ? `Fill Form: ${selectedForm.name}` : 'View Submission'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
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

