
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  const submitBtn = document.getElementById('submit-btn');
  const currentStepElem = document.getElementById('current-step');
  const totalStepsElem = document.getElementById('total-steps');
  const progressFill = document.getElementById('progress-fill');
  const progressSteps = document.querySelectorAll('.progress-step');
  const quizSections = document.querySelectorAll('.quiz-section');
  const loadingOverlay = document.getElementById('loading-overlay');
  const timerDisplay = document.getElementById('timer-display');
  const mechanicalQuestions = document.getElementById('mechanical-questions');
  const electricalQuestions = document.getElementById('electrical-questions');
  const softwareQuestions = document.getElementById('software-questions');
  
  // Variables
  const totalSteps = quizSections.length - 1; // Exclude completion screen
  let currentStep = 0;
  let timeLeft = 900; // 15 minutes in seconds
  let timerInterval = null;
  const answers = {};
  
  // Initialize
  totalStepsElem.textContent = totalSteps;
  updateProgress();
  
  // Event listeners
  nextBtn.addEventListener('click', handleNext);
  prevBtn.addEventListener('click', handlePrev);
  submitBtn.addEventListener('click', handleSubmit);
  
  // Add input change listeners
  document.getElementById('name').addEventListener('input', (e) => {
    answers.name = e.target.value;
  });
  
  document.getElementById('reg-number').addEventListener('input', (e) => {
    answers.regNumber = e.target.value;
  });
  
  // Domain selection listener
  const domainRadios = document.querySelectorAll('input[name="domain"]');
  domainRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      answers.domain = e.target.value;
    });
  });
  
  // Add listeners for all question inputs
  document.querySelectorAll('.textarea, input[type="text"]').forEach(input => {
    input.addEventListener('input', (e) => {
      // Store answer with exact field name for Google Sheets
      answers[e.target.name] = e.target.value;
    });
  });
  
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.name !== 'domain') { // Domain selection is handled separately
        answers[e.target.name] = e.target.value;
      }
    });
  });
  
  function handleNext() {
    if (currentStep === 0) {
      // Validate name and reg number
      const name = document.getElementById('name').value;
      const regNumber = document.getElementById('reg-number').value;
      
      if (!name || !regNumber) {
        showToast('Please fill in all fields', 'error');
        return;
      }
      
      answers.name = name;
      answers.regNumber = regNumber;
    }
    
    if (currentStep === 1) {
      // Validate domain selection
      const selectedDomain = document.querySelector('input[name="domain"]:checked');
      
      if (!selectedDomain) {
        showToast('Please select a domain', 'error');
        return;
      }
      
      answers.domain = selectedDomain.value;
      
      // Show correct domain questions
      const domain = answers.domain;
      if (domain === 'mechanical') {
        mechanicalQuestions.style.display = 'block';
        electricalQuestions.style.display = 'none';
        softwareQuestions.style.display = 'none';
      } else if (domain === 'electrical') {
        mechanicalQuestions.style.display = 'none';
        electricalQuestions.style.display = 'block';
        softwareQuestions.style.display = 'none';
      } else if (domain === 'software') {
        mechanicalQuestions.style.display = 'none';
        electricalQuestions.style.display = 'none';
        softwareQuestions.style.display = 'block';
      }
      
      // Start timer for mechanical and electrical domains
      if (domain === 'mechanical' || domain === 'electrical') {
        startTimer();
      }
      // Show submit button on last step
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    }
    
    // Move to next step
    if (currentStep < totalSteps - 1) {
      currentStep++;
      updateUI();
    }
  }
  
  function handlePrev() {
    if (currentStep > 0) {
      // If going back from domain questions, clear timer
      if (currentStep === 2) {
        stopTimer();
        submitBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');
      }
      
      currentStep--;
      updateUI();
    }
  }
  
  function updateUI() {
    // Update step indicator
    currentStepElem.textContent = currentStep + 1;
    
    // Update button states
    prevBtn.disabled = currentStep === 0;
    
    // Show active section, hide others
    quizSections.forEach((section, index) => {
      if (index === currentStep) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
    
    // Update progress
    updateProgress();
  }
  
  function updateProgress() {
    const progressPercentage = (currentStep / (totalSteps - 1)) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    
    // Update progress steps
    progressSteps.forEach((step, index) => {
      if (index <= currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }
  
  function startTimer() {
    // Reset timer
    timeLeft = 900;
    updateTimerDisplay();
    
    // Start countdown
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      
      if (timeLeft <= 0) {
        stopTimer();
        handleAutoSubmit();
      }
    }, 1000);
  }
  
  function stopTimer() {
    clearInterval(timerInterval);
  }
  
  function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Visual indicator when time is running low
    if (timeLeft < 60) {
      timerDisplay.style.color = 'var(--error-color)';
    } else if (timeLeft < 180) {
      timerDisplay.style.color = 'var(--warning-color)';
    } else {
      timerDisplay.style.color = '';
    }
  }
  
  function handleAutoSubmit() {
    showToast('Time is up! Your answers have been automatically submitted.', 'warning');
    submitToGoogleSheets();
  }
  
  function handleSubmit() {
    // Validate domain-specific questions
    const domain = answers.domain;
    let isValid = true;
    
    if (domain === 'mechanical' || domain === 'electrical') {
      // For simplicity, we're just checking if any answer was provided
      // You might want to make this validation more robust
      const questionPrefix = domain === 'mechanical' ? 'm_q' : 'e_q';
      const questionCount = domain === 'mechanical' ? 6 : 14;
      
      for (let i = 1; i <= questionCount; i++) {
        const fieldName = `${questionPrefix}${i}`;
        if (!answers[fieldName]) {
          isValid = false;
          break;
        }
      }
    } else if (domain === 'software') {
      // Check if submission ID is entered
      const submissionId = document.getElementById('software_submission_id').value;
      if (!submissionId) {
        isValid = false;
      }
      answers.software_submission_id = submissionId;
    }
    
    if (!isValid) {
      showToast('Please answer all questions', 'error');
      return;
    }
    
    submitToGoogleSheets();
  }
  
  function submitToGoogleSheets() {
    // Show loading overlay
    loadingOverlay.classList.remove('hidden');
    
    // Create a hidden iframe for form submission to avoid CORS issues
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.name = 'submission-frame';
    document.body.appendChild(iframe);
    
    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://script.google.com/macros/s/AKfycbxgAQ7IivpcGCYfzxspVYN7zg6DEoF51qRr3Zxh08MC0ELm5Ea7Vz_Wvd76Sg30db6O/exec';
    form.target = 'submission-frame';
    
    // Add each field to the form
    for (const key in answers) {
      if (answers.hasOwnProperty(key)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = answers[key] || '';
        form.appendChild(input);
      }
    }
    
    // Set up a timeout to handle cases where the iframe doesn't load
    const timeoutID = setTimeout(() => {
      loadingOverlay.classList.add('hidden');
      
      // Show completion screen with error message
      currentStep = totalSteps;
      updateUI();
      
      // Add error message to completion screen
      const errorMessage = document.createElement('div');
      errorMessage.classList.add('submission-error');
      errorMessage.innerHTML = `
        <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>There was an error submitting your application. Please try again later.</span>
      `;
      
      const completionContent = document.querySelector('#completion .card-content');
      if (completionContent) {
        completionContent.appendChild(errorMessage);
      }
      
      // Hide navigation buttons
      submitBtn.classList.add('hidden');
      prevBtn.classList.add('hidden');
    }, 5000); // 5 seconds timeout
    
    // Add a load event to the iframe to handle completion
    iframe.onload = function() {
      clearTimeout(timeoutID);
      loadingOverlay.classList.add('hidden');
      
      // Show completion screen
      currentStep = totalSteps;
      updateUI();
      
      // Add success message to completion screen
      const successMessage = document.createElement('div');
      successMessage.classList.add('submission-success');
      successMessage.innerHTML = `
        <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span>Your application has been successfully submitted!</span>
      `;
      
      const completionContent = document.querySelector('#completion .card-content');
      if (completionContent) {
        completionContent.appendChild(successMessage);
      }
      
      // Display submission details
      document.getElementById('submission-name').textContent = `Name: ${answers.name}`;
      document.getElementById('submission-reg').textContent = `Reg Number: ${answers.regNumber}`;
      document.getElementById('submission-domain').textContent = `Domain: ${capitalizeFirstLetter(answers.domain)}`;
      
      // Hide navigation buttons
      submitBtn.classList.add('hidden');
      prevBtn.classList.add('hidden');
      
      // Clean up iframe after submission
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    };
    
    // Attach the form to the body and submit it
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }
  
  function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add styles
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '4px';
    toast.style.color = 'white';
    toast.style.zIndex = '1000';
    toast.style.maxWidth = '300px';
    toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    
    // Set background color based on type
    if (type === 'error') {
      toast.style.backgroundColor = 'var(--error-color)';
    } else if (type === 'success') {
      toast.style.backgroundColor = 'var(--success-color)';
    } else if (type === 'warning') {
      toast.style.backgroundColor = 'var(--warning-color)';
    } else {
      toast.style.backgroundColor = 'var(--primary-color)';
    }
    
    // Add to body
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 500);
    }, 3000);
  }
  
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
});
