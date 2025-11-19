import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScienceIcon from '@mui/icons-material/Science';
import PeopleIcon from '@mui/icons-material/People';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DescriptionIcon from '@mui/icons-material/Description';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 240;

const menuItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon />, adminOnly: false },
  { path: '/studies', label: 'Studies', icon: <ScienceIcon />, adminOnly: false },
  { path: '/forms', label: 'Forms', icon: <AssignmentIcon />, adminOnly: false },
  { path: '/submissions', label: 'Submissions', icon: <DescriptionIcon />, adminOnly: false },
  { path: '/users', label: 'Users', icon: <PeopleIcon />, adminOnly: true },
  { path: '/hospitals', label: 'Hospitals', icon: <LocalHospitalIcon />, adminOnly: true },
  { path: '/export', label: 'Export Data', icon: <FileDownloadIcon />, adminOnly: true },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          marginTop: '64px',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <List>
          {filteredMenuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;

