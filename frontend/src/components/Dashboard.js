import React, {useState, useEffect} from 'react';
import { Card, CardContent,
          CardActions, Button,
          ThemeProvider, Typography,
          createTheme, GlobalStyles,
          Box, InputLabel, MenuItem,
          FormControl, Select, 
          TextField, Alert,
          Modal, Grid
        } from '@mui/material';

import { LineChart } from '@mui/x-charts/LineChart';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import Welcome from './welcome';


function Dashboard() {

  const [patientEmails, setPatientEmails] = useState([]);     // retrieve patient emails from database

  const [patientEmail, setPatientEmail] = useState('');       // patient email selected

  const [patientData, setPatientData] = useState([]);

  const [showGraph, setShowGraph] = useState(true);

  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [formData, setFormData] = useState({
    user_email: `${patientEmail}`,
    age: '',
    gender: '',
    weight: '',
    height: '',
    ap_hi: '',
    ap_lo: '',
    cholesterol: '',
    glucose: '',
    alco: '',
    smoke: '',
    active: '',
    bmi: '',
    bp_encoded: '',
    createdAt: '',
  });

  const [registerUserData, setRegisterUserData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleChangeRegisterUser = (event) => {
    setRegisterUserData({...registerUserData, [event.target.name]: event.target.value});
  };

  const fetchPatientEmails = () => {
    fetch('/api/patientEmails')
      .then((res) => {
        if(res.ok){
          return res.json();
        }else{
          console.error(res.json());
        }
      })
      .then((data) => {
        setPatientEmails(data);
        console.log("Patient emails retrieved");
      })
      .catch((error) => {
        console.log("Fetching patient email failed: ", error);
      })
    
  };

  const fetchPatientData = (patientEmail) => {
    fetch(`/api/patientData?user_email=${patientEmail}`)
      .then((res) => {
        if(res.ok){
          return res.json();
        }else{
          setPatientData([]);
        }
      })
      .then((data) => {
        if(data.length > 0){
          console.log(data);
          const formattedData = data.map(item => ({
            not_presence_prediction: parseFloat(item.not_presence_prediction),
            presence_prediction: parseFloat(item.presence_prediction),
            createdAt: new Date(item.createdAt).toISOString().split('T')[0]
          }))
          .filter(item => 
            !isNaN(item.not_presence_prediction) && 
            !isNaN(item.presence_prediction) &&
            item.createdAt
          )
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

          setPatientData(formattedData);
        }else{
          console.log("No patient data");
        }
        
      })
      .catch((error) => {
        console.log("Can't retrieve patient data: ", error);
      })
  };

  const sendPatientData = () => {
    const request = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json',
      },
      'body': JSON.stringify(formData)
    };
    fetch('/api/predict', request)
      .then((res) => {
        if(res.ok){
          console.log("Patient data request sent successfully");
          return res.json();
        }
      })
      .catch((error) => {
        console.log("Can't send patient data: ", error);
        setError("Error can't send patient data");
      })
  };

  const registerPatient = () => {
    const request = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json',
      },
      'body': JSON.stringify(registerUserData),
    };

    fetch('/api/createUser', request)
      .then((res) => {
        if(res.ok){
          return res.json();
        }
      })
      .catch((error) => {
        console.log("Can't register user error: ", error);
      })
  };


  useEffect(() => {
    fetchPatientEmails();
  }, []);

  useEffect(() => {
    fetchPatientData(patientEmail);
  }, [showGraph]);

  console.log(patientData);


  const theme = createTheme({
    palette: {
      mode: 'dark',
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
    },
  });

  return (

    <ThemeProvider theme={theme}>
      <GlobalStyles
      styles={{
        body: {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          fontFamily: theme.typography.fontFamily,
        },
        '.MuiTypography-root': {
          fontFamily: theme.typography.fontFamily,
        },
        '.MuiTable-root': {
          fontFamily: theme.typography.fontFamily,
        },
        '.MuiTableCell-root': {
          fontFamily: theme.typography.fontFamily,
        },
        '.MuiCardContent-root': {
          fontFamily: theme.typography.fontFamily,
        },
      }}
  />
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100vh',
        overflow: 'auto',
      }}
    >
      <Box sx={{
        width: '20%',
        marginBottom: '10px',
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'row',
      }}>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">Patient Email</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={patientEmail}
          label="patientEmail"
          onChange={(e) => {
            setPatientEmail(e.target.value);
            fetchPatientData(e.target.value);
          }}
        >
          {patientEmails.length > 0 ? 
            patientEmails.map((email, index) => (
              <MenuItem key={index} value={email.email}>{email.email}</MenuItem>
            ))
          : null}
        </Select>
      </FormControl>
      <Button size = 'small' variant='outlined' sx={{marginLeft: '10px'}} onClick={handleOpen}><Typography>Add Patient</Typography></Button>
      </Box>


      <Card color="blue" variant="outlined" sx={{ 
        width: 900,
        height: 650, 
        borderRadius: '15px',
        boxShadow: "0 0 60px rgba(0,0,0,0.3)",
        "&:hover": {
          boxShadow: "0 0 60px rgba(37, 150, 190, 0.3)",
        },
        display: 'flex',
        flexDirection: 'column',
        }}>
        <CardContent  sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}>

        
        {/* Loader */}
        <Box sx={{
            flex: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {patientEmail === '' ? <Welcome /> : null}
        </Box>
        
        {/* The Graphs */}
        <Box sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {showGraph && patientData.length > 0 ? (
            <LineChart
              width={800}
              height={550}
              series={[
                {
                  data: patientData.map(d => d.presence_prediction),
                  label: 'Presence Prediction',
                  color: 'red',
                },
                {
                  data: patientData.map(d => d.not_presence_prediction),
                  label: 'AbsencePrediction',
                  color: 'green',
                },
              ]}
              xAxis={[{
                scaleType: 'point',
                data: patientData.map(d => d.createdAt),
                label: 'Date',
              }]}
              yAxis={[{
                label: 'Prediction',
              }]}
            />
          ) : patientEmail !== '' && showGraph && patientData.length === 0 ? (
            <Typography variant="h6" align="center">No data available</Typography>
          ) : null}
        </Box>

        {/* Form to send to model */}
        {!showGraph && 
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '10px',
            marginBottom: '60px'
          }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth
                  onChange={handleChange} 
                  name="age" 
                  label="Age" 
                  size='small' 
                  type="number" 
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <MenuItem value={1}>Male</MenuItem>
                    <MenuItem value={2}>Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth
                  onChange={handleChange} 
                  name="weight" 
                  label="Weight(kg)" 
                  size='small' 
                  type="number" 
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth
                  onChange={handleChange} 
                  name="height" 
                  label="Height(cm)" 
                  size='small' 
                  type="number" 
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth
                  onChange={handleChange} 
                  name="ap_hi" 
                  label="Systolic blood pressure" 
                  size='small' 
                  type="number" 
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth
                  onChange={handleChange} 
                  name="ap_lo" 
                  label="Diastolic blood pressure" 
                  size='small' 
                  type="number" 
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Cholesterol</InputLabel>
                  <Select
                    name="cholesterol"
                    value={formData.cholesterol}
                    onChange={handleChange}
                  >
                    <MenuItem value={1}>Normal</MenuItem>
                    <MenuItem value={2}>Above Normal</MenuItem>
                    <MenuItem value={3}>Well Above Normal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Glucose</InputLabel>
                  <Select
                    name="glucose"
                    value={formData.glucose}
                    onChange={handleChange}
                  >
                    <MenuItem value={1}>Normal</MenuItem>
                    <MenuItem value={2}>Above Normal</MenuItem>
                    <MenuItem value={3}>Well Above Normal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Smokes?</InputLabel>
                  <Select
                    name="smoke"
                    value={formData.smoke}
                    onChange={handleChange}
                  >
                    <MenuItem value={0}>Non-smoker</MenuItem>
                    <MenuItem value={1}>Smoker</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Drinks?</InputLabel>
                  <Select
                    name="alco"
                    value={formData.alco}
                    onChange={handleChange}
                  >
                    <MenuItem value={0}>Doesn't consume alcohol</MenuItem>
                    <MenuItem value={1}>Consumes alcohol</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Exercises?</InputLabel>
                  <Select
                    name="active"
                    value={formData.active}
                    onChange={handleChange}
                  >
                    <MenuItem value={0}>Not physically active</MenuItem>
                    <MenuItem value={1}>Physically active</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Blood pressure category</InputLabel>
                  <Select
                    name="bp_encoded"
                    value={formData.bp_encoded}
                    onChange={handleChange}
                  >
                    <MenuItem value={0}>Normal</MenuItem>
                    <MenuItem value={1}>Elevated</MenuItem>
                    <MenuItem value={2}>Hypertension Stage 1</MenuItem>
                    <MenuItem value={3}>Hypertension Stage 2</MenuItem>
                    <MenuItem value={4}>Hypertensive Crisis</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Date"
                  size="small"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  name="createdAt"
                  value={formData.createdAt}
                  onChange={handleChange}
                  sx={{
                    '& input[type="date"]::-webkit-calendar-picker-indicator': {
                      filter: 'invert(1)',
                    },
                  }}
                  
                />
              </Grid>
            </Grid>
            </Box>
        }


        <Box sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {patientData.length > 0 || patientEmail !== '' ?
            <Button 
                size='small'
                variant='outlined'
                onClick={() => {
                  setShowGraph(!showGraph);
                  if(!showGraph){
                    formData.user_email = patientEmail;
                    formData.bmi = (formData.weight / (((formData.height)/100) **2)).toFixed(2).slice(0, 5)
                    console.log(formData);
                    sendPatientData();
                    fetchPatientData(patientEmail);
                  }
                }}
            >
              {showGraph === true ?
                <Typography>Add Data</Typography>
              : <Typography>Predict</Typography>}
              
            </Button>
            : null}
        </Box>


        </CardContent>
          
      </Card>

      {/* Modal for registering new patients */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
      <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          height: 400,
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
          borderRadius: '15px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
      }}>
        <Typography id="modal-modal-title" variant="h6" component="h2" sx={{marginBottom: '20px'}}>
          Register Patient
        </Typography>
      
        <TextField  onChange={handleChangeRegisterUser} sx={{marginBottom: '5px'}} name = "username" label="Username" size='medium'inputProps={{ min: 0 }}/>
        <TextField  onChange={handleChangeRegisterUser} sx={{marginBottom: '5px'}} name = "email" label="Email" size='medium'inputProps={{ min: 0 }}/>

        <Button
          variant='outlined'
          sx={{marginTop: '20px'}}
          onClick={(event) => {
            handleChangeRegisterUser(event);
            registerUserData.password = registerUserData.username + "@ycjik";
            registerUserData.confirmPassword = registerUserData.password;
            console.log(registerUserData);
            registerPatient();
          }}
          >Register</Button>

      </Box>
    </Modal>
      
    </div>
    </ThemeProvider>

  )
}

export default Dashboard