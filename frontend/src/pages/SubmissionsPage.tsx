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
  TextField,
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
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required?: boolean;
      unique_key?: boolean;
      options?: string[];
      placeholder?: string;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
      };
    }>;
  };
}

const SubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [viewMode, setViewMode] = useState<'create' | 'view' | 'edit'>('create');
  const [error, setError] = useState('');
  const [loadingSubmission, setLoadingSubmission] = useState(false);

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
    if (err.response?.data) {
      // Try to get detailed error message
      if (err.response.data.detail) {
        return err.response.data.detail;
      }
      if (err.response.data.message) {
        return err.response.data.message;
      }
      if (typeof err.response.data === 'string') {
        return err.response.data;
      }
    }
    if (err.response?.status) {
      const statusText = err.response.statusText || 'An error occurred on the server';
      const detail = err.response.data?.detail || '';
      return `Server Error (${err.response.status}): ${statusText}${detail ? ' - ' + detail : ''}`;
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
      const submissionsData = response.data || [];
      
      // Log for debugging
      console.log('Fetched submissions:', submissionsData.length);
      
      // Check for decryption errors
      const decryptionErrors = submissionsData.filter((s: any) => s._decryption_error);
      if (decryptionErrors.length > 0) {
        console.warn(`Warning: ${decryptionErrors.length} submissions have decryption errors`);
      }
      
      setSubmissions(submissionsData);
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
      setSelectedStudy(String(studyId));
      setSelectedSubmission(null);
      setViewMode('create');
      setSubmissionDialogOpen(true);
    }
  };

  const handleSubmitForm = async (data: Record<string, any>) => {
    if (!selectedForm || !selectedStudy) return;

    try {
      if (viewMode === 'edit' && selectedSubmission) {
        // Update existing submission
        const response = await api.put(`/api/submissions/${selectedSubmission.id}`, {
          data_json: data,
        });
        console.log('Submission updated successfully:', response.data);
        setSubmissionDialogOpen(false);
        setSelectedForm(null);
        setSelectedSubmission(null);
        setSelectedStudy('');
        setViewMode('create');
        setError(''); // Clear any previous errors
        // Refresh submissions list
        await fetchSubmissions();
      } else {
        // Create new submission
        const response = await api.post('/api/submissions', {
          form_id: selectedForm.id,
          study_id: Number(selectedStudy),
          data_json: data,
        });
        console.log('Submission created successfully:', response.data);
        setSubmissionDialogOpen(false);
        setSelectedForm(null);
        setSelectedSubmission(null);
        setSelectedStudy('');
        setViewMode('create');
        setError(''); // Clear any previous errors
        // Refresh submissions list
        await fetchSubmissions();
      }
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
    const study = studies.find((s) => String(s.id) === selectedStudy);
    return study?.forms || [];
  };

  const getUniqueKeyLabels = (form: Form | null): string[] => {
    if (!form?.schema_json?.fields) return [];
    return form.schema_json.fields
      .filter((field) => field.unique_key)
      .map((field) => field.label || field.name);
  };

  const getSubmissionUniqueKeyDisplay = (submission: Submission, form?: Form): string => {
    if (!form?.schema_json?.fields || !submission?.data_json) return '-';

    const uniqueFields = form.schema_json.fields.filter((field) => field.unique_key);
    if (uniqueFields.length === 0) return '-';

    const values = uniqueFields
      .map((field) => {
        const rawValue = submission.data_json[field.name];
        if (rawValue === null || rawValue === undefined || `${rawValue}`.trim() === '') {
          return null;
        }
        const label = field.label || field.name;
        return `${label}: ${rawValue}`;
      })
      .filter(Boolean);

    return values.length > 0 ? values.join(' | ') : '-';
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
          <TextField
            select
            label="Study"
            value={selectedStudy}
            onChange={async (e) => {
              const studyId = String(e.target.value);
              setSelectedStudy(studyId);
              setSelectedForm(null);
              // Refresh study details to get latest forms
              await refreshStudyDetails(Number(studyId));
            }}
            SelectProps={{ native: true }}
            sx={{ minWidth: 240 }}
          >
            <option value="" />
            {studies.map((study) => (
              <option key={study.id} value={String(study.id)}>
                {study.name}
              </option>
            ))}
          </TextField>
          {studies.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {studies.map((study) => (
                <Button
                  key={study.id}
                  size="small"
                  variant={selectedStudy === String(study.id) ? 'contained' : 'outlined'}
                  onClick={async () => {
                    const studyId = String(study.id);
                    setSelectedStudy(studyId);
                    setSelectedForm(null);
                    await refreshStudyDetails(Number(studyId));
                  }}
                >
                  {study.name}
                </Button>
              ))}
            </Box>
          )}
          {selectedStudy && (
            <TextField
              select
              label="Form"
              value={selectedForm ? String(selectedForm.id) : ''}
              onChange={(e) => {
                const formId = String(e.target.value);
                const form = getAvailableForms().find((f) => String(f.id) === formId);
                setSelectedForm(form || null);
              }}
              SelectProps={{ native: true }}
              disabled={getAvailableForms().length === 0}
              sx={{ minWidth: 240 }}
            >
              <option value="" />
              {getAvailableForms().map((form) => (
                <option key={form.id} value={String(form.id)}>
                  {form.name}
                </option>
              ))}
            </TextField>
          )}
          {selectedStudy && getAvailableForms().length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {getAvailableForms().map((form) => (
                <Button
                  key={form.id}
                  size="small"
                  variant={selectedForm?.id === form.id ? 'contained' : 'outlined'}
                  onClick={() => setSelectedForm(form)}
                >
                  {form.name}
                </Button>
              ))}
            </Box>
          )}
          {selectedStudy && getAvailableForms().length === 0 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              No forms are assigned to this study. Please assign a form to this study on the Studies page first.
            </Alert>
          )}
          {selectedForm && selectedStudy && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                onClick={() => handleCreateSubmission(Number(selectedStudy), selectedForm.id)}
              >
                Fill Form
              </Button>
              {getUniqueKeyLabels(selectedForm).length > 0 ? (
                <Alert severity="info" sx={{ py: 0 }}>
                  Unique key fields: {getUniqueKeyLabels(selectedForm).join(', ')}
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ py: 0 }}>
                  This form has no unique key configured.
                </Alert>
              )}
            </Box>
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
              <TableCell>Unique Key(s)</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No submissions found. {error ? 'Error: ' + error : 'Create a new submission above.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => {
                const study = studies.find((s) => s.id === submission.study_id);
                const form = forms.find((f) => f.id === submission.form_id);
                const hasDecryptionError = (submission as any)._decryption_error;
                return (
                  <TableRow key={submission.id}>
                    <TableCell>{submission.id}</TableCell>
                    <TableCell>{study?.name || submission.study_id}</TableCell>
                    <TableCell>
                      {form?.name || submission.form_id}
                      {hasDecryptionError && (
                        <Typography variant="caption" color="error" display="block">
                          (Decryption error)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{getSubmissionUniqueKeyDisplay(submission, form)}</TableCell>
                    <TableCell>{new Date(submission.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {submission.updated_at
                        ? new Date(submission.updated_at).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={hasDecryptionError}
                          onClick={async () => {
                            setLoadingSubmission(true);
                            setError('');
                            try {
                              // Fetch the full submission details
                              const response = await api.get(`/api/submissions/${submission.id}`);
                              const submissionData = response.data;
                              console.log('Fetched submission data:', submissionData);
                              
                              // Find the form for this submission
                              let submissionForm = forms.find((f) => f.id === submission.form_id);
                              
                              // If form not found in local list, fetch it from API
                              if (!submissionForm) {
                                try {
                                  console.log(`Form ${submission.form_id} not in local list, fetching from API...`);
                                  const formResponse = await api.get(`/api/forms/${submission.form_id}`);
                                  const fetchedForm: Form = formResponse.data;
                                  submissionForm = fetchedForm;
                                  // Add to local forms list for future use
                                  setForms((prevForms) => {
                                    if (!prevForms.find((f) => f.id === fetchedForm.id)) {
                                      return [...prevForms, fetchedForm];
                                    }
                                    return prevForms;
                                  });
                                } catch (formErr: any) {
                                  console.error('Failed to fetch form:', formErr);
                                  setError(`Form not found (form_id: ${submission.form_id}). The form may have been deleted.`);
                                  setSubmissionDialogOpen(true);
                                  return;
                                }
                              }
                          
                          if (submissionForm) {
                            // Process submission data to convert date strings to Date objects
                            const processedData: Record<string, any> = {};
                            if (submissionData.data_json && Object.keys(submissionData.data_json).length > 0) {
                              Object.keys(submissionData.data_json).forEach((key) => {
                                const value = submissionData.data_json[key];
                                // Check if this field is a date type in the form schema
                                const field = submissionForm.schema_json?.fields?.find((f: any) => f.name === key);
                                if (field?.type === 'date' && typeof value === 'string') {
                                  // Convert date string to Date object
                                  const dateValue = new Date(value);
                                  processedData[key] = isNaN(dateValue.getTime()) ? value : dateValue;
                                } else {
                                  processedData[key] = value;
                                }
                              });
                            } else {
                              console.warn('Submission data_json is empty or missing');
                            }
                            
                            setSelectedForm(submissionForm);
                            setSelectedSubmission({
                              ...submissionData,
                              data_json: processedData,
                            });
                            setViewMode('view');
                            setSelectedStudy(String(submissionData.study_id));
                            setError(''); // Clear any previous errors
                            setSubmissionDialogOpen(true);
                          } else {
                            setError(`Form not found for this submission (form_id: ${submission.form_id})`);
                            setSubmissionDialogOpen(true); // Open dialog to show error
                          }
                            } catch (err: any) {
                              console.error('Failed to fetch submission:', {
                                error: err,
                                message: err.message,
                                response: err.response,
                                data: err.response?.data,
                              });
                              const errorMessage = getErrorMessage(err);
                              setError(errorMessage);
                              // Open dialog to show error instead of closing
                              setSubmissionDialogOpen(true);
                            } finally {
                              setLoadingSubmission(false);
                            }
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={hasDecryptionError}
                          onClick={async () => {
                            setLoadingSubmission(true);
                            setError('');
                            try {
                              // Fetch the full submission details
                              const response = await api.get(`/api/submissions/${submission.id}`);
                              const submissionData = response.data;
                              console.log('Fetched submission data for edit:', submissionData);
                              
                              // Find the form for this submission
                              let submissionForm = forms.find((f) => f.id === submission.form_id);
                              
                              // If form not found in local list, fetch it from API
                              if (!submissionForm) {
                                try {
                                  console.log(`Form ${submission.form_id} not in local list, fetching from API...`);
                                  const formResponse = await api.get(`/api/forms/${submission.form_id}`);
                                  const fetchedForm = formResponse.data;
                                  submissionForm = fetchedForm;
                                  // Add to local forms list for future use
                                  setForms((prevForms) => {
                                    if (!prevForms.find((f) => f.id === fetchedForm.id)) {
                                      return [...prevForms, fetchedForm];
                                    }
                                    return prevForms;
                                  });
                                } catch (formErr: any) {
                                  console.error('Failed to fetch form:', formErr);
                                  setError(`Form not found (form_id: ${submission.form_id}). The form may have been deleted.`);
                                  setSubmissionDialogOpen(true);
                                  return;
                                }
                              }
                              
                              if (submissionForm) {
                                // Process submission data to convert date strings to Date objects
                                const processedData: Record<string, any> = {};
                                if (submissionData.data_json) {
                                  Object.keys(submissionData.data_json).forEach((key) => {
                                    const value = submissionData.data_json[key];
                                    // Check if this field is a date type in the form schema
                                    const field = submissionForm.schema_json.fields.find((f: any) => f.name === key);
                                    if (field?.type === 'date' && typeof value === 'string') {
                                      // Convert date string to Date object
                                      processedData[key] = new Date(value);
                                    } else {
                                      processedData[key] = value;
                                    }
                                  });
                                }
                                
                                setSelectedForm(submissionForm);
                                setSelectedSubmission({
                                  ...submissionData,
                                  data_json: processedData,
                                });
                                setViewMode('edit');
                                setSelectedStudy(String(submissionData.study_id));
                                setSubmissionDialogOpen(true);
                              } else {
                                setError('Form not found for this submission');
                              }
                            } catch (err: any) {
                              console.error('Failed to fetch submission for edit:', {
                                error: err,
                                message: err.message,
                                response: err.response,
                                data: err.response?.data,
                              });
                              const errorMessage = getErrorMessage(err);
                              setError(errorMessage);
                              // Don't close dialog on error - let user see the error
                              // setSubmissionDialogOpen(false);
                            } finally {
                              setLoadingSubmission(false);
                            }
                          }}
                        >
                          Edit
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={submissionDialogOpen}
        onClose={() => {
          setSubmissionDialogOpen(false);
          setSelectedForm(null);
          setSelectedSubmission(null);
          setViewMode('create');
          setError(''); // Clear error when closing
          setLoadingSubmission(false); // Reset loading state
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {viewMode === 'view' 
            ? `View Submission: ${selectedForm?.name || 'Submission'}` 
            : viewMode === 'edit'
            ? `Edit Submission: ${selectedForm?.name || 'Submission'}`
            : `Fill Form: ${selectedForm?.name || 'Form'}`}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedForm && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Unique key fields:{' '}
              {getUniqueKeyLabels(selectedForm).length > 0
                ? getUniqueKeyLabels(selectedForm).join(', ')
                : 'None configured'}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {!selectedForm && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Form not found. Please try again.
            </Alert>
          )}
          {loadingSubmission && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {!loadingSubmission && selectedForm && !selectedSubmission && viewMode !== 'create' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No submission data available.
            </Alert>
          )}
          {!loadingSubmission && selectedForm && (
            <>
              {viewMode === 'view' && selectedSubmission && (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={() => setViewMode('edit')}
                  >
                    Edit Submission
                  </Button>
                </Box>
              )}
              {selectedForm.schema_json && selectedForm.schema_json.fields ? (
                <FormRenderer
                  schema={selectedForm.schema_json}
                  onSubmit={viewMode !== 'view' ? handleSubmitForm : undefined}
                  initialData={(viewMode === 'view' || viewMode === 'edit') && selectedSubmission ? selectedSubmission.data_json : {}}
                  submitLabel={viewMode === 'edit' ? 'Update Submission' : 'Submit'}
                  readOnly={viewMode === 'view'}
                />
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Form schema is invalid or missing fields.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default SubmissionsPage;

