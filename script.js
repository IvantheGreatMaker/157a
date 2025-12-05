document.getElementById('showCreateAccount').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('signinForm').style.display = 'none';
    document.getElementById('createAccountForm').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Create Account';
});

document.getElementById('showSignIn').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('createAccountForm').style.display = 'none';
    document.getElementById('signinForm').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Sign In';
});

document.getElementById('signinForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('username', username);
            window.location.href = 'matches.html';
        } else {
            alert(data.message || 'Invalid username or password');
        }
    } catch (error) {
        alert('Connection error. Make sure the server is running.');
    }
});

document.getElementById('createAccountForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('newPassword').value;
    
    if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('username', username);
            window.location.href = 'matches.html';
        } else {
            alert(data.message || 'Failed to create account');
        }
    } catch (error) {
        alert('Connection error. Make sure the server is running.');
    }
});

