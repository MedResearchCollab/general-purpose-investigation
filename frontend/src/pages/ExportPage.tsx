import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Study {
  id: number;
  name: string;
  forms?: Form[];
}

interface Form {
  id: number;
  name: string;
}

interface Hospital {
  id: number;
  name: string;
}

const ExportPage: React.FC = () => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    study_id: '' as number | '',
    form_id: '' as number | '',
    hospital_id: '' as number | '',
    start_date: null as Date | null,
    end_date: null as Date | null,
  });
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  const getAvailableForms = (): Form[] => {
    if (!filters.study_id) return [];
    const selectedStudy = studies.find((study) => study.id === filters.study_id);
    return selectedStudy?.forms || [];
  };

  const buildFilterSummary = () => {
    const parts: string[] = [];
    if (filters.study_id) parts.push(`study_id=${filters.study_id}`);
    if (filters.form_id) parts.push(`form_id=${filters.form_id}`);
    if (filters.hospital_id) parts.push(`hospital_id=${filters.hospital_id}`);
    if (filters.start_date) parts.push(`start_date=${filters.start_date.toISOString()}`);
    if (filters.end_date) parts.push(`end_date=${filters.end_date.toISOString()}`);
    return parts.length > 0 ? parts.join(', ') : 'no filters';
  };

  const parseExportError = async (err: any): Promise<string> => {
    const statusCode = err?.response?.status;
    const defaultMessage = `Failed to export data${statusCode ? ` (HTTP ${statusCode})` : ''}.`;
    const responseData = err?.response?.data;

    try {
      if (responseData instanceof Blob) {
        const text = await responseData.text();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (parsed?.detail) return `${parsed.detail}`;
            if (parsed?.message) return `${parsed.message}`;
            return text;
          } catch {
            return text;
          }
        }
      } else if (responseData?.detail) {
        return responseData.detail;
      } else if (responseData?.message) {
        return responseData.message;
      }
    } catch {
      // Ignore parsing failures and fallback below.
    }

    if (err?.message) {
      return `${defaultMessage} ${err.message}`;
    }
    return defaultMessage;
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [studiesRes, hospitalsRes] = await Promise.all([
        api.get('/api/studies'),
        api.get('/api/hospitals'),
      ]);

      // Load study details so each study includes only its assigned forms.
      const detailedStudies = await Promise.all(
        (studiesRes.data || []).map(async (study: Study) => {
          try {
            const detailRes = await api.get(`/api/studies/${study.id}`);
            return detailRes.data;
          } catch {
            return { ...study, forms: [] };
          }
        })
      );

      setStudies(detailedStudies);
      setHospitals(hospitalsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    setError('');

    try {
      const exportData = {
        study_id: filters.study_id || null,
        form_id: filters.form_id || null,
        hospital_id: filters.hospital_id || null,
        start_date: filters.start_date?.toISOString() || null,
        end_date: filters.end_date?.toISOString() || null,
      };

      const response = await api.post(
        `/api/export/${format}`,
        exportData,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const detailedMessage = await parseExportError(err);
      setError(`${detailedMessage} Applied filters: ${buildFilterSummary()}.`);
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">You don't have permission to access this page.</Alert>
      </Container>
    );
  }

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
        Export Data
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Export Filters
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Study</InputLabel>
            <Select
              value={filters.study_id}
              onChange={(e) => {
                const studyId = e.target.value as number;
                const selectedStudy = studies.find((study) => study.id === studyId);
                const studyForms = selectedStudy?.forms || [];
                const currentFormStillValid = studyForms.some((form) => form.id === filters.form_id);

                setFilters({
                  ...filters,
                  study_id: studyId,
                  form_id: currentFormStillValid ? filters.form_id : '',
                });
              }}
              label="Study"
            >
              <MenuItem value="">All Studies</MenuItem>
              {studies.map((study) => (
                <MenuItem key={study.id} value={study.id}>
                  {study.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Form</InputLabel>
            <Select
              value={filters.form_id}
              onChange={(e) => setFilters({ ...filters, form_id: e.target.value as number })}
              label="Form"
              disabled={!filters.study_id}
            >
              <MenuItem value="">
                {filters.study_id ? 'All Forms in Selected Study' : 'Select a Study First'}
              </MenuItem>
              {getAvailableForms().map((form) => (
                <MenuItem key={form.id} value={form.id}>
                  {form.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Hospital</InputLabel>
            <Select
              value={filters.hospital_id}
              onChange={(e) => setFilters({ ...filters, hospital_id: e.target.value as number })}
              label="Hospital"
            >
              <MenuItem value="">All Hospitals</MenuItem>
              {hospitals.map((hospital) => (
                <MenuItem key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={filters.start_date}
              onChange={(newValue) => setFilters({ ...filters, start_date: newValue })}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
            <DatePicker
              label="End Date"
              value={filters.end_date}
              onChange={(newValue) => setFilters({ ...filters, end_date: newValue })}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </LocalizationProvider>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleExport('csv')}
            disabled={exporting}
            size="large"
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleExport('json')}
            disabled={exporting}
            size="large"
          >
            Export JSON
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ExportPage;

