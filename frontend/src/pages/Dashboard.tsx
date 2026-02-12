import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  studies_count: number;
  forms_count: number;
  submissions_count: number;
  users_count: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studiesRes, formsRes, submissionsRes, usersRes] = await Promise.all([
          api.get('/api/studies'),
          api.get('/api/forms'),
          api.get('/api/submissions'),
          isAdmin ? api.get('/api/users') : Promise.resolve({ data: [] }),
        ]);

        const submissionsData = submissionsRes.data || [];
        console.log('Dashboard: Fetched submissions count:', submissionsData.length);

        setStats({
          studies_count: studiesRes.data.length,
          forms_count: formsRes.data.length,
          submissions_count: submissionsData.length,
          users_count: usersRes.data.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set default stats on error
        setStats({
          studies_count: 0,
          forms_count: 0,
          submissions_count: 0,
          users_count: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome, {user?.full_name}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{ p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
            onClick={() => navigate('/studies')}
          >
            <Typography variant="h3" color="primary">
              {stats?.studies_count || 0}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Studies
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{ p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
            onClick={() => navigate('/forms')}
          >
            <Typography variant="h3" color="primary">
              {stats?.forms_count || 0}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Forms
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{ p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
            onClick={() => navigate('/submissions')}
          >
            <Typography variant="h3" color="primary">
              {stats?.submissions_count || 0}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Submissions
            </Typography>
          </Paper>
        </Grid>
        {isAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{ p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
              onClick={() => navigate('/users')}
            >
              <Typography variant="h3" color="primary">
                {stats?.users_count || 0}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Users
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Dashboard;

