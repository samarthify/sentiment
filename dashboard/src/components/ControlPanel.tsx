import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  DeleteSweep,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format, formatDistanceToNow } from 'date-fns';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface AgentStatus {
  is_busy: boolean;
  current_task: string | null;
  last_run: {
    [key: string]: {
      time: string;
      success: boolean;
      duration: number;
      error?: string;
    };
  };
  next_scheduled_run: string | null;
  config: any;
  system_health: any;
}

const ControlPanel: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch agent status
  const { data: status, isLoading } = useQuery<AgentStatus>(
    'agentStatus',
    async () => {
      const response = await axios.get(`${API_BASE_URL}/status`);
      return response.data;
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  // Command mutation
  const { mutate: executeCommand, isLoading: isExecuting } = useMutation(
    async ({ command, params }: { command: string; params?: any }) => {
      const response = await axios.post(`${API_BASE_URL}/command`, { command, params });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agentStatus');
      },
    }
  );

  const handleCommand = (command: string) => {
    executeCommand({ command });
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Card>
      <CardContent>
        <Grid container spacing={3}>
          {/* Status Section */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Agent Status
              </Typography>
              <Chip
                icon={status?.is_busy ? <Warning /> : <CheckCircle />}
                label={status?.is_busy ? 'Busy' : 'Ready'}
                color={status?.is_busy ? 'warning' : 'success'}
              />
            </Box>
            {status?.current_task && (
              <Alert severity="info">
                Currently executing: {status.current_task}
              </Alert>
            )}
          </Grid>

          {/* Control Buttons */}
          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrow />}
                onClick={() => handleCommand('collect_and_process')}
                disabled={status?.is_busy || isExecuting}
              >
                Collect & Process
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Refresh />}
                onClick={() => handleCommand('collect')}
                disabled={status?.is_busy || isExecuting}
              >
                Collect Only
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Refresh />}
                onClick={() => handleCommand('process')}
                disabled={status?.is_busy || isExecuting}
              >
                Process Only
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<DeleteSweep />}
                onClick={() => handleCommand('cleanup')}
                disabled={status?.is_busy || isExecuting}
              >
                Cleanup
              </Button>
            </Box>
          </Grid>

          {/* Last Run Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Last Run Information
            </Typography>
            <Grid container spacing={2}>
              {status?.last_run &&
                Object.entries(status.last_run).map(([task, info]) => (
                  <Grid item xs={12} md={6} key={task}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          {task.charAt(0).toUpperCase() + task.slice(1)}
                        </Typography>
                        <Typography variant="body2">
                          Time: {format(new Date(info.time), 'PPpp')}
                        </Typography>
                        <Typography variant="body2">
                          Duration: {info.duration.toFixed(2)}s
                        </Typography>
                        <Chip
                          size="small"
                          label={info.success ? 'Success' : 'Failed'}
                          color={info.success ? 'success' : 'error'}
                          sx={{ mt: 1 }}
                        />
                        {info.error && (
                          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                            Error: {info.error}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </Grid>

          {/* Next Scheduled Run */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Next Scheduled Run
            </Typography>
            {status?.next_scheduled_run ? (
              <Typography variant="body2">
                {formatDistanceToNow(new Date(status.next_scheduled_run), {
                  addSuffix: true,
                })}
              </Typography>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No scheduled runs
              </Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ControlPanel; 