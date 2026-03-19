class SafeHerApp {
    constructor() {
        this.isTracking = false;
        this.currentPosition = null;
        this.watchId = null;
        this.emergencyActive = false;
        this.tapCount = 0;
        this.lastTapTime = 0;
        this.tapTimeout = 2000;
        this.emergencyContacts = []; // 👈 NEW: Custom contacts
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.requestPermissionsSilent(); // 👈 NO POPUP
        this.updateStatus('🟢', 'Safe Mode', 'Ready to protect you');
        this.refreshContactsDisplay();
    }

    // 👈 SILENT Permissions (No Popup)
    requestPermissionsSilent() {
        if ('Notification' in window) {
            Notification.requestPermission().catch(() => {});
        }
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                () => {}, 
                () => {}, 
                { enableHighAccuracy: true }
            );
        }
    }

    bindEvents() {
        // Existing buttons
        document.getElementById('emergencyBtn').addEventListener('click', () => this.emergencySOS('Manual'));
        document.getElementById('silentAlertBtn').addEventListener('click', () => this.silentAlert());
        document.getElementById('liveTrackBtn').addEventListener('click', () => this.toggleLiveTracking());
        document.getElementById('quickContactsBtn').addEventListener('click', () => this.toggleContacts());
        document.getElementById('stopTrackingBtn').addEventListener('click', () => this.stopTracking());
        
        // 👈 NEW: Contacts Management
        document.getElementById('editContactsBtn').addEventListener('click', () => this.toggleEditMode());
        document.getElementById('saveContactsBtn').addEventListener('click', () => this.saveContacts());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.cancelEdit());
        
        // Triple Tap
        document.addEventListener('click', (e) => this.handleTripleTap(e), { passive: true });
        document.addEventListener('touchend', (e) => this.handleTripleTap(e), { passive: true });
    }

    // 👈 CUSTOM CONTACTS MANAGEMENT
    loadSettings() {
        const saved = localStorage.getItem('emergencyContacts');
        this.emergencyContacts = saved ? JSON.parse(saved) : [
            { name: 'Police', phone: '100' },
            { name: 'Ambulance', phone: '108' },
            { name: 'Emergency 1', phone: '+919876543210' },
            { name: 'Emergency 2', phone: '+919112233445' }
        ];
        this.refreshContactsDisplay();
    }

    refreshContactsDisplay() {
        const container = document.getElementById('savedContactsList');
        container.innerHTML = '';

        this.emergencyContacts.forEach((contact, index) => {
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.innerHTML = `
                <div>
                    <strong>${contact.name}</strong>
                    <span>${contact.phone}</span>
                </div>
                <button class="call-btn" onclick="app.makeCall('${contact.phone}')">📞 Call</button>
            `;
            container.appendChild(div);
        });

        // Populate edit form
        this.populateEditForm();
    }

    toggleEditMode() {
        const editForm = document.getElementById('editForm');
        const list = document.getElementById('savedContactsList');
        const editBtn = document.getElementById('editContactsBtn');
        
        if (editForm.style.display === 'none') {
            editForm.style.display = 'block';
            list.style.display = 'none';
            editBtn.textContent = '✅ Done';
        } else {
            this.cancelEdit();
        }
    }

    populateEditForm() {
        const contacts = ['1', '2'];
        contacts.forEach(i => {
            const contact = this.emergencyContacts[i-1] || { name: '', phone: '' };
            document.getElementById(`contactName${i}`).value = contact.name;
            document.getElementById(`contactPhone${i}`).value = contact.phone;
        });
    }

    saveContacts() {
        const newContacts = [
            {
                name: document.getElementById('contactName1').value || 'Emergency 1',
                phone: document.getElementById('contactPhone1').value || '+919876543210'
            },
            {
                name: document.getElementById('contactName2').value || 'Emergency 2', 
                phone: document.getElementById('contactPhone2').value || '+919112233445'
            }
        ];

        // Keep police/ambulance fixed, replace custom ones
        this.emergencyContacts = [
            this.emergencyContacts[0], // Police
            this.emergencyContacts[1], // Ambulance  
            newContacts[0],
            newContacts[1]
        ];

        localStorage.setItem('emergencyContacts', JSON.stringify(this.emergencyContacts));
        this.refreshContactsDisplay();
        this.cancelEdit();
        
        // Success feedback
        this.updateStatus('✅', 'Contacts Saved', 'Your emergency numbers updated');
        setTimeout(() => this.updateStatus('🟢', 'Safe Mode', 'Ready to protect you'), 2000);
    }

    cancelEdit() {
        document.getElementById('editForm').style.display = 'none';
        document.getElementById('savedContactsList').style.display = 'block';
        document.getElementById('editContactsBtn').textContent = '✏️ Edit';
    }

    // 👈 ENHANCED EMERGENCY with CUSTOM CONTACTS
    async emergencySOS(source = 'Manual') {
        this.emergencyActive = true;
        document.getElementById('emergencyBtn').classList.add('pulse');
        
        this.updateStatus('🔴', 'EMERGENCY ACTIVE', `${source} Triggered`);
        
        const location = await this.getCurrentLocation();
        const alertType = source === 'TripleTap' ? '🚨 TRIPLE TAP SOS' : '🚨 EMERGENCY';
        
        const message = `${alertType}!\n📍 https://maps.google.com/?q=${location.lat},${location.lng}`;
        
        this.sendEmergencyAlert(message);
        
        // 👈 CALL ALL CUSTOM CONTACTS
        this.emergencyContacts.forEach(contact => {
            setTimeout(() => this.makeCall(contact.phone), 500 * this.emergencyContacts.indexOf(contact));
        });
        
        // WhatsApp to first custom contact
        if (this.emergencyContacts[2]) {
            this.shareToWhatsApp(location, source, this.emergencyContacts[2]);
        }
        
        this.logAlert(`${alertType} (${source}) - All contacts notified`);
        
        setTimeout(() => {
            document.getElementById('emergencyBtn').classList.remove('pulse');
        }, 5000);
    }

    shareToWhatsApp(location, source, contact) {
        const trigger = source === 'TripleTap' ? '🔥 TRIPLE TAP' : '🚨 SOS';
        const message = `${trigger}!\nFrom ${contact.name}\n📍 https://maps.google.com/?q=${location.lat},${location.lng}`;
        const whatsappURL = `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappURL, '_blank');
    }

    // 👈 EXPOSE app globally for onclick calls
    makeCall(phone) {
        window.location.href = `tel:${phone}`;
        this.logAlert(`📞 Calling ${phone}`);
    }

    // Keep all other existing methods...
    handleTripleTap(e) {
        const now = Date.now();
        if (now - this.lastTapTime > this.tapTimeout) {
            this.tapCount = 0;
        }
        this.tapCount++;
        this.lastTapTime = now;
        
        if (this.tapCount >= 3) {
            this.tapCount = 0;
            this.tripleTapEmergency();
        }
    }

    tripleTapEmergency() {
        document.body.style.background = '#ff0000';
        setTimeout(() => document.body.style.background = '', 500);
        this.emergencySOS('TripleTap');
    }

    silentAlert() {
        this.getCurrentLocation().then(location => {
            const message = `🤫 SILENT ALERT\n📍 https://maps.google.com/?q=${location.lat},${location.lng}`;
            this.sendEmergencyAlert(message);
            this.logAlert('🤫 Silent Alert Sent');
        });
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    resolve(this.currentPosition);
                },
                reject,
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }

    async toggleLiveTracking() {
        if (!this.isTracking) await this.startLiveTracking();
        else this.stopTracking();
    }

    async startLiveTracking() {
        this.isTracking = true;
        document.getElementById('liveTrackBtn').textContent = '📍 Live Track ON';
        document.getElementById('liveTrackBtn').style.background = '#4CAF50';
        document.getElementById('locationCard').style.display = 'block';

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
                this.updateLocationDisplay();
            },
            (error) => console.error('Tracking error:', error),
            { enableHighAccuracy: true }
        );
    }

    stopTracking() {
        this.isTracking = false;
        document.getElementById('liveTrackBtn').textContent = '📍 Live Track ON';
        document.getElementById('liveTrackBtn').style.background = '';
        document.getElementById('locationCard').style.display = 'none';
        if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    }

    updateLocationDisplay() {
        if (this.currentPosition) {
            const locLink = `https://maps.google.com/?q=${this.currentPosition.lat},${this.currentPosition.lng}`;
            document.getElementById('currentLocation').innerHTML = 
                `<a href="${locLink}" target="_blank">${this.currentPosition.lat.toFixed(6)}, ${this.currentPosition.lng.toFixed(6)}</a>`;
        }
    }

    sendEmergencyAlert(message) {
        if (Notification.permission === 'granted') {
            new Notification('🚨 SafeHer Emergency', { body: message, icon: 'icons/icon-192.png' });
        }
    }

    toggleContacts() {
        const panel = document.getElementById('contactsPanel');
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    }

    updateStatus(icon, title, subtitle) {
        document.getElementById('statusIcon').textContent = icon;
        document.getElementById('statusText').textContent = title;
        document.getElementById('statusSubtext').textContent = subtitle;
    }

    logAlert(message) {
        const log = document.getElementById('alertLog');
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `<span>${message}</span><small>${time}</small>`;
        log.insertBefore(entry, log.firstChild);
        while (log.children.length > 10) log.removeChild(log.lastChild);
    }
}

// Global app reference for onclick
const app = new SafeHerApp();

document.addEventListener('DOMContentLoaded', () => {
    // Already initialized above
});