(function() {
  // Generate unique session ID
  const sessionId = 'hw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = 'https://hubermanchat.vercel.app/widget';
  iframe.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 500px;
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    display: none;
    background: white;
  `;
  iframe.setAttribute('id', 'huberman-voice-widget');

  // Create toggle button
  const button = document.createElement('button');
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7117 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0034 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92176 4.44061 8.37485 5.27072 7.03255C6.10083 5.69025 7.28825 4.60557 8.7 3.9C9.87812 3.30493 11.1801 2.99656 12.5 3H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 30px;
    background: #00AFEF;
    border: none;
    cursor: pointer;
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 175, 239, 0.3);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  `;
  button.setAttribute('id', 'huberman-voice-button');
  button.setAttribute('aria-label', 'Open Huberman Lab Voice Assistant');

  // Add hover effect
  button.onmouseenter = () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 16px rgba(0, 175, 239, 0.4)';
  };
  button.onmouseleave = () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 175, 239, 0.3)';
  };

  // Toggle widget
  let isOpen = false;
  button.onclick = () => {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    button.style.display = isOpen ? 'none' : 'flex';

    // Notify parent about state change
    if (window.onWidgetStateChange) {
      window.onWidgetStateChange(isOpen);
    }
  };

  // Handle messages from iframe
  window.addEventListener('message', (e) => {
    // Only accept messages from our domain
    if (e.origin !== 'https://hubermanchat.vercel.app') return;

    if (e.data.type === 'close') {
      isOpen = false;
      iframe.style.display = 'none';
      button.style.display = 'flex';
    }

    if (e.data.type === 'track') {
      // Forward tracking events with session ID and page URL
      fetch('https://hubermanchat.vercel.app/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...e.data.payload,
          session_id: sessionId,
          page_url: window.location.href
        })
      }).catch(() => {
        // Ignore tracking errors
      });
    }
  });

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(iframe);
      document.body.appendChild(button);
    });
  } else {
    document.body.appendChild(iframe);
    document.body.appendChild(button);
  }

  // Store session ID for tracking
  window.HubermanVoiceSession = sessionId;
})();