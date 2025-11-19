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
  const [forms, setForms] = useState<Form[]>([]);
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

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [studiesRes, formsRes, hospitalsRes] = await Promise.all([
        api.get('/api/studies'),
        api.get('/api/forms'),
        api.get('/api/hospitals'),
      ]);
      setStudies(studiesRes.data);
      setForms(formsRes.data);
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
      setError(err.response?.data?.detail || 'Failed to export data');
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
              onChange={(e) => setFilters({ ...filters, study_id: e.target.value as number })}
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
            >
              <MenuItem value="">All Forms</MenuItem>
              {forms.map((form) => (
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

