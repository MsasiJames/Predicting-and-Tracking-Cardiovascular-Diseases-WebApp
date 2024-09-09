import React, {useState, useEffect} from 'react';
import { Card, CardContent,
          CardActions, Button,
          ThemeProvider, Typography,
          createTheme, GlobalStyles,
          Box, InputLabel, MenuItem,
          FormControl, Select, 
          TextField, Alert,
          Modal, Grid, Table,
          TableBody, TableCell,
          TableContainer, TableHead,
          TableRow, Paper, IconButton, 
          Tooltip, Autocomplete, Switch,
          FormControlLabel, FormHelperText
        } from '@mui/material';

import jsPDF from 'jspdf';
import 'jspdf-autotable';

import * as XLSX from 'xlsx'

import { LineChart } from '@mui/x-charts/LineChart';

import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import InfoIcon from '@mui/icons-material/Info';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import Welcome from './welcome';
import SuggestionLoader from './suggestionLoader';


function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          // Check if this cookie string begins with the name we want
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
          }
      }
  }
  return cookieValue;
}


function Dashboard() {

  const csrfToken = getCookie('csrftoken');

  const [patientEmails, setPatientEmails] = useState([]);     // retrieve patient emails from database

  const [patientEmail, setPatientEmail] = useState('');       // patient email selected

  const [patientData, setPatientData] = useState([]);

  const [xlsxPatientData, setXLSXPatientData] = useState([]);

  const [oneImportedPatiendOnly, setOneImportedPatiendOnly] = useState(false);

  const [allPatientData, setAllPatientData] = useState([]);

  const [suggestion, setSuggestion] = useState('');

  const [showGraph, setShowGraph] = useState(true);

  const [error, setError] = useState('');

  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState(false);

  const [importPredictSuccess, setImportPredictSuccess] = useState(false);
  const [importPredictError, setImportPredictError] = useState(false);

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [openSuggestions, setOpenSuggestions] = useState(false);
  const handleSuggestionOpen = () => setOpenSuggestions(true);
  const handelSuggestionClose = () => {
    setOpenSuggestions(false);
    setSuggestion('');
  };

  const [openImportPatient, setOpenImportPatients] = useState(false);
  const handleImportPatientOpen = () => setOpenImportPatients(true);
  const handleImportPatientClose = () => setOpenImportPatients(false);

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
            createdAt: new Date(item.createdAt).toISOString().split('T')[0],
            leading_cause_1: item.leading_cause_1,
            leading_cause_2: item.leading_cause_2,
            leading_cause_3: item.leading_cause_3,
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
        'X-CSRFToken': csrfToken,
      },
      'body': JSON.stringify(formData)
    };
    fetch('/api/predict', request)
      .then((res) => {
        if(res.ok){
          console.log("Patient data request sent successfully");
          fetchPatientData(patientEmail);
          return res.json();
        }
      })
      .catch((error) => {
        console.log("Can't send patient data: ", error);
        setError("Error can't send patient data");
      })
  };

  const getImportedPatientData = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const workBook = XLSX.read(arrayBuffer, {type: 'binary'});
      const workSheet = workBook.Sheets[workBook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(workSheet);

      const formattedData = jsonData.map(row => {
        const formattedRow = {};
  
        for (let key in row) {
          let value = row[key];
  
          // Only format the 'createdAt' field
          if (key === 'createdAt' && typeof value === 'number') {
            const date = new Date(Math.round((value - 25569) * 86400 * 1000));
            value = date.toISOString().split('T')[0];
          }
  
          formattedRow[key] = value;
        }
  
        return formattedRow;
      });
  
      setXLSXPatientData(formattedData);
    };

    reader.readAsArrayBuffer(file);
    console.log("Patient file captured: ", xlsxPatientData);
  };

  const importButtonClicked = () => {
    document.getElementById('fileUpload').click();
  };

  const sendImportedPatientData = () => {

    const request = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      'body': JSON.stringify(registerUserData),
    };

    fetch('/api/createUser', request)
      .then((res) => {
        if(res.ok){
          console.log("User registered successfully!");
          const updatedXLSXData = xlsxPatientData.map(item => ({
            ...item,
            'user_email': registerUserData.email,
          }))

          setXLSXPatientData(updatedXLSXData);

          updatedXLSXData.forEach(patientData => {
            const requestTwo = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
              },
              body: JSON.stringify(patientData),
            };
            
            fetch('/api/predict', requestTwo)
              .then((res) => {
                if (res.ok) {
                  console.log("Patient data request sent successfully");
                  return res.json().then(() => {
                    setImportPredictSuccess(true);
                    setTimeout(() => {
                      setImportPredictSuccess(false);
                      window.location.reload();
                    }, 2000)
                  });
                }else{
                  setImportPredictError(true);
                  setTimeout(() => {
                    setImportPredictError(false);
                  }, 2000);
                }
              })
              .catch((error) => {
                console.log("Can't send patient data: ", error);
                setError("Error can't send patient data");
              });
          })

        }else{
          console.log("User was not registered successfully: ", res.json());
          setImportPredictError(true);
          setTimeout(() => {
            setImportPredictError(false);
          }, 2000);
        }
      })
      .catch((error) => {
        console.log("Can't register user error: ", error);
      })


  };
  

  const registerPatient = () => {
    const request = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      'body': JSON.stringify(registerUserData),
    };

    fetch('/api/createUser', request)
      .then((res) => {
        if(res.ok){
          setRegisterSuccess(true);
          setTimeout(() => {
            setRegisterSuccess(false);
          }, 2000);
          return res.json();
        }else{
          setRegisterError(true);
          setTimeout(() => {
            setRegisterError(false);
          }, 2000);
        }
      })
      .catch((error) => {
        console.log("Can't register user error: ", error);
      })
  };

  const fetchAllPatientData = () => {
    fetch('/api/getAllPatientData')
      .then((res) => {
        if(res.ok){
          return res.json();
        }
      })
      .then((data) => {
        setAllPatientData(data);
      })
      .catch((error) => {
        console.log("Can't fetch all patient data: ", error);
      })
  };

  const exportToPDF = async (patientEmail) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
  
    // Capture the screen
    const stream = await navigator.mediaDevices.getDisplayMedia({preferCurrentTab: true});
    const video = document.createElement('video');
    
    video.srcObject = stream;
    await new Promise(resolve => video.onloadedmetadata = resolve);
    video.play();
  
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Stop the screen capture
    stream.getTracks().forEach(track => track.stop());
  
    // Crop the image (adjust these values as needed)
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    const cropWidth = canvas.width;
    const cropHeight = canvas.height - 100;  // Capture top half of the screen
    
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    croppedCtx.drawImage(canvas, 0, 0, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  
    const imgData = croppedCanvas.toDataURL('image/png');
  
    // Calculate dimensions for PDF
    const imgWidth = pageWidth - 20;
    const imgHeight = (cropHeight * imgWidth) / cropWidth;
  
    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
  
    // Prepare table data
    const tableData = [
      ['Date', 'Presence Prediction', 'Absence Prediction', 'Leading Cause 1', 
        'Leading Cause 2', 'Leading Cause 3'],
      ...patientData.map(d => [
        d.createdAt,
        Number(d.presence_prediction).toFixed(4),
        Number(d.not_presence_prediction).toFixed(4),
        d.leading_cause_1,
        d.leading_cause_2,
        d.leading_cause_3
      ])
    ];
  
    // Add table to PDF below the image
    pdf.autoTable({
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: imgHeight + 20, // Start table 20mm below the image
      margin: { top: 10 },
      styles: { overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 25 } }
    });
  
    pdf.save(`${patientEmail}.pdf`);
  };

  const fetchSuggestions = (prob, leading_cause_1, leading_cause_2, leading_cause_3) => {
      const request = {
        'method': 'POST',
        'headers': {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        'body': JSON.stringify({
          'presence_probability': `${prob}`,
          'leading_cause_1': `${leading_cause_1}`,
          'leading_cause_2': `${leading_cause_2}`,
          'leading_cause_3': `${leading_cause_3}`
        })
      };
      fetch('/api/suggest', request)
        .then((res) => {
          if(res.ok){
            console.log("Suggestion retrieved successfully")
            return res.json();
          }else{
            console.log("Error occured: ", res.json())
          }
        })
        .then((data) => {
          setSuggestion(data.Success)
        })
        .catch((error) => {
          console.log("Error fetching suggestions for patient: ", error)
        })
  };

  useEffect(() => {
    fetchPatientEmails();
    fetchPatientData(patientEmail);
    fetchAllPatientData();
  }, []);

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
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        overflow: 'auto',
        gap: 10
      }}
    >
      <Box sx={{
        width: '40%',
        marginBottom: '10px',
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'row',
      }}>
      <FormControl fullWidth>
        {/* <InputLabel id="demo-simple-select-label">Patient Email</InputLabel> */}
        <Autocomplete
          id="patient-email-autocomplete"
          options={patientEmails}
          getOptionLabel={(option) => option.email}
          // value={patientEmail}
          onChange={(event, newValue) => {
            setPatientEmail(newValue ? newValue.email : '');
            fetchPatientData(newValue ? newValue.email : '');
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Patient Email"
            />
          )}
        />
      </FormControl>
      <Button size = 'small' variant='outlined' sx={{marginLeft: '10px', textTransform: 'none', width:'300px'}} onClick={handleOpen}><Typography>Add Patient</Typography></Button>

      <Button size = 'small' variant='outlined' onClick={handleImportPatientOpen} sx={{marginLeft: '10px', textTransform: 'none', width:'300px'}}><Typography>Import Patient Data</Typography></Button>

      </Box>


      <Card color="blue" variant="outlined" sx={{ 
        width: 900,
        minHeight: 300,
        // height: 650, 
        borderRadius: '15px',
        boxShadow: "0 0 60px rgba(0,0,0,0.3)",
        "&:hover": {
          boxShadow: "0 0 60px rgba(37, 150, 190, 0.3)",
        },
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '30px'
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
        
        {/* The Line Graph */}
        <div id="graph-container">
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
                    label: 'Absence Prediction',
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
        </div>

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
                  }
                }}
                sx={{textTransform: 'none', marginRight: '10px'}}
            >
              {showGraph === true ?
                <Typography>Add Data</Typography>
              : <Typography>Predict</Typography>}
              
            </Button>
            : null}

            {showGraph && patientEmail && <Button 
                  size='small' variant='outlined' sx={{textTransform: 'none'}}
                  onClick={async () => {
                    await exportToPDF(patientEmail)
                  }}
                  >
              <Typography>Export</Typography>
              </Button>}
        </Box>


        </CardContent>
          
      </Card>

      <Card variant='outlined' sx={{
        width: '1000px',
        // maxWidth: '900px',
        minHeight: '400px',
        borderRadius: '15px',
        boxShadow: "0 0 60px rgba(0,0,0,0.3)",
        "&:hover": {
          boxShadow: "0 0 60px rgba(37, 150, 190, 0.3)",
        },
        display: 'flex',
        flexDirection: 'column',
        }}>
        <CardContent>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="presence prediction table">
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Presence Prediction</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Leading Causes
                    <Tooltip title = 'ap_hi = systolic blood pressure, ap_lo = diastolic blood pressure'>
                        <InfoIcon fontSize='1px' />
                    </Tooltip>
                </TableCell>
                <TableCell>Suggestions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allPatientData.length > 0 ?
                allPatientData.map((data, index) => (
                  <TableRow 
                    key={index}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{data.user_email}</TableCell>
                    <TableCell>{(Number(data.presence_prediction)).toFixed(4)}</TableCell>
                    <TableCell>{(Number(data.presence_prediction)).toFixed(4) > 0.7 ? 
                                  <Alert severity="error" sx={{width: '200px'}}> Needs attention</Alert> : 
                                  (Number(data.presence_prediction)).toFixed(4) < 0.5 ?
                                  <Alert severity="success" sx={{width: '200px'}}>Safe</Alert> :
                                  <Alert severity="warning" sx={{width: '200px'}}>Monitor</Alert>}
                    </TableCell>
                    <TableCell style={{ whiteSpace: 'pre-wrap' }}>
                      {data.leading_cause_1}
                      {'\n'}
                      {data.leading_cause_2}
                      {'\n'}
                      {data.leading_cause_3}
                  </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => {
                          handleSuggestionOpen(e)
                          fetchSuggestions((Number(data.presence_prediction)).toFixed(4), data.leading_cause_1, data.leading_cause_2, data.leading_cause_3)
                        }}>
                        <MoreHorizIcon />
                        </IconButton>
                      </TableCell>
                  </TableRow>
                )): 
                <Typography>No data available</Typography>
                }
              
            </TableBody>
          </Table>
        </TableContainer>
          <Typography variant="body2" color="text.secondary">
              Disclaimer: This model provides information and predictions based on data but does not constitute medical advice. Always consult a qualified healthcare professional for personalized medical guidance and diagnosis
          </Typography>
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

          <Box sx={{
            marginTop: '10px',
          }}>
            {registerSuccess && (<Alert severity="success">Patient registered</Alert>)}
            {registerError && (<Alert severity="warning">Error, can't register</Alert>)}
          </Box>





      </Box>
      </Modal>

      <Modal
        open={openSuggestions}
        onClose={handelSuggestionClose}
      >
        <Box 
          sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
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
          <SuggestionLoader />
          {suggestion.length > 0 && (
            suggestion.split(/(?=\d\.\s)/).map((part, index) => (
              <Typography key={index} paragraph>
                {part.trim()}
              </Typography>
            ))
          )}
          
        </Box>
      </Modal>

      <Modal
        open={openImportPatient}
        onClose={handleImportPatientClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
      <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
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
{/* 

<FormControlLabel
          control={
            <Switch onChange={() => {
              setOneImportedPatiendOnly(!oneImportedPatiendOnly)
            }}/>
          }
          // label='Check if one patient, leave unchecked if many patients'
        />
        <FormHelperText>Check if one patient, leave unchecked if many patients</FormHelperText>

*/}

        <FormHelperText>Add patient's history, excel file must be in xlsx format</FormHelperText> 
        <TextField
          onChange={handleChangeRegisterUser}
          name='username'
          placeholder='Patient name'
          variant='outlined'
          InputLabelProps={{ style: { color: 'white' } }}
          InputProps={{
            style: { color: 'white' },
            sx: {
              borderRadius: '15px',
              '& fieldset': {
                borderRadius: '15px',
              },
            },
          }}
          sx={{ width: '250px', marginBottom: '15px', marginTop: '15px' }}
          // disabled={!oneImportedPatiendOnly}
        />

        <TextField
          onChange={handleChangeRegisterUser}
          name='email'
          placeholder='Patient email'
          variant='outlined'
          InputLabelProps={{ style: { color: 'white' } }}
          InputProps={{
            style: { color: 'white' },
            sx: {
              borderRadius: '15px',
              '& fieldset': {
                borderRadius: '15px',
              },
            },
          }}
          sx={{ width: '250px', marginBottom: '15px', marginTop: '15px'  }}
          // disabled={!oneImportedPatiendOnly}
        />
      
      <input 
        type="file"
        id="fileUpload"
        accept=".xlsx, .xls"
        onChange={getImportedPatientData}
        style={{ display: 'none' }}
      /> 
      <Button size = 'small' variant='outlined' onClick={importButtonClicked} startIcon={<CloudUploadIcon />} sx={{marginLeft: '10px', textTransform: 'none', marginBottom: '15px' }}><Typography>Upload xlsx file</Typography></Button>

      {xlsxPatientData.length > 0 && 
      
        <Button size = 'small' variant='outlined' onClick={(event) => {
          handleChangeRegisterUser(event);
          registerUserData.password = registerUserData.username + "@ycjik";
          registerUserData.confirmPassword = registerUserData.password;
          console.log(registerUserData);
          sendImportedPatientData();
        }} sx={{marginBottom: '15px', textTransform: 'none' }}>
          <Typography>Predict</Typography>
        </Button>  

        
      }

      {xlsxPatientData.length > 0 && console.log(xlsxPatientData)}

      <Box sx={{
            marginTop: '10px',
          }}>
            {importPredictSuccess && (<Alert severity="success">Patient's data imported and sent for prediction</Alert>)}
            {importPredictError && (<Alert severity="warning">Something is not right</Alert>)}
          </Box>

      </Box>
      </Modal>

      
    </div>
    </ThemeProvider>

  )
}

export default Dashboard