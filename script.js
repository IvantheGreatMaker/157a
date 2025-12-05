document.getElementById('signinForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Simple validation - any username/password works
    if (username && password) {
        window.location.href = 'matches.html';
    } else {
        alert('Please enter both username and password');
    }
});

