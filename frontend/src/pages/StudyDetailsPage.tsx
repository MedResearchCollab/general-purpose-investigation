import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

interface StudyFormProfile {
  submissions_count: number;
  contributors_count: number;
  last_updated_at: string | null;
  required_fields_count: number;
  complete_submissions_count: number;
  completion_rate_pct: number;
  dataframe_profile?: {
    total_submissions: number;
    fields: Array<{
      name: string;
      label: string;
      type: string;
      filled_count: number;
      missing_count: number;
      filled_pct: number;
      value_counts?: Record<string, number>;
    }>;
  };
}

interface StudyForm {
  id: number;
  name: string;
  profile?: StudyFormProfile;
}

interface StudyDetails {
  id: number;
  title?: string;
  name: string;
  summary?: string;
  status: 'Data Collection' | 'Analysis' | 'Closed' | 'Canceled';
  forms: StudyForm[];
}

const StudyDetailsPage: React.FC = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [study, setStudy] = useState<StudyDetails | null>(null);

  useEffect(() => {
    const fetchStudy = async () => {
      if (!studyId) return;

      try {
        const response = await api.get(`/api/studies/${studyId}`);
        setStudy(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load study details');
      } finally {
        setLoading(false);
      }
    };

    fetchStudy();
  }, [studyId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !study) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">{error || 'Study not found'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Study Details</Typography>
        <Button variant="outlined" onClick={() => navigate('/studies')}>
          Back to Studies
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">{study.title || study.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {study.summary || '-'}
        </Typography>
        <Chip label={study.status} size="small" />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Data Collection Profiling by Form
        </Typography>
        {study.forms.length === 0 ? (
          <Typography color="text.secondary">No forms assigned to this study.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {study.forms.map((form) => (
              <Box key={form.id}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {form.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Submissions: {form.profile?.submissions_count ?? 0} | Contributors: {form.profile?.contributors_count ?? 0}
                  {' '}| Completed: {form.profile?.complete_submissions_count ?? 0} ({form.profile?.completion_rate_pct ?? 0}%)
                  {' '}| Required fields: {form.profile?.required_fields_count ?? 0}
                  {' '}| Last update: {form.profile?.last_updated_at
                    ? new Date(form.profile.last_updated_at).toLocaleString()
                    : '-'}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Field</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Completed</TableCell>
                      <TableCell>Missing</TableCell>
                      <TableCell>Completion %</TableCell>
                      <TableCell>Value Distribution</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(form.profile?.dataframe_profile?.fields || []).map((field) => (
                      <TableRow key={field.name}>
                        <TableCell>{field.label}</TableCell>
                        <TableCell>{field.type}</TableCell>
                        <TableCell>{field.filled_count}</TableCell>
                        <TableCell>{field.missing_count}</TableCell>
                        <TableCell>{field.filled_pct}%</TableCell>
                        <TableCell>
                          {field.value_counts && Object.keys(field.value_counts).length > 0
                            ? Object.entries(field.value_counts)
                                .map(([value, count]) => `${value}: ${count}`)
                                .join(' | ')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!form.profile?.dataframe_profile?.fields || form.profile.dataframe_profile.fields.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No schema fields available for profiling.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default StudyDetailsPage;
