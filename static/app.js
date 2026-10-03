const { createApp, ref, computed, onMounted, reactive } = Vue;

const API_URL = '/contacts';

const FIELDS_SCHEMA = [
    { id: "first_name", label: "First Name", tab: 'basic', width: 150, visible: true },
    { id: "last_name", label: "Last Name", tab: 'basic', width: 150, visible: true },
    { id: "display_name", label: "Display Name", tab: 'basic', width: 150, visible: true },
    { id: "nickname", label: "Nickname", tab: 'basic', width: 120, visible: false },
    { id: "primary_email", label: "Primary Email", tab: 'basic', width: 200, visible: true },
    { id: "secondary_email", label: "Secondary Email", tab: 'basic', width: 200, visible: false },
    { id: "screen_name", label: "Screen Name", tab: 'basic', width: 120, visible: false },

    { id: "work_phone", label: "Work Phone", tab: 'contact', width: 140, visible: true },
    { id: "home_phone", label: "Home Phone", tab: 'contact', width: 140, visible: false },
    { id: "fax_number", label: "Fax Number", tab: 'contact', width: 140, visible: false },
    { id: "pager_number", label: "Pager Number", tab: 'contact', width: 140, visible: false },
    { id: "mobile_number", label: "Mobile Number", tab: 'contact', width: 140, visible: true },

    { id: "home_address", label: "Home Address", tab: 'address', width: 200, visible: false },
    { id: "home_address_2", label: "Home Address 2", tab: 'address', width: 150, visible: false },
    { id: "home_city", label: "Home City", tab: 'address', width: 120, visible: false },
    { id: "home_state", label: "Home State", tab: 'address', width: 100, visible: false },
    { id: "home_zipcode", label: "Home ZipCode", tab: 'address', width: 100, visible: false },
    { id: "home_country", label: "Home Country", tab: 'address', width: 120, visible: false },

    { id: "work_address", label: "Work Address", tab: 'address', width: 200, visible: false },
    { id: "work_address_2", label: "Work Address 2", tab: 'address', width: 150, visible: false },
    { id: "work_city", label: "Work City", tab: 'address', width: 120, visible: false },
    { id: "work_state", label: "Work State", tab: 'address', width: 100, visible: false },
    { id: "work_zipcode", label: "Work ZipCode", tab: 'address', width: 100, visible: false },
    { id: "work_country", label: "Work Country", tab: 'address', width: 120, visible: false },

    { id: "job_title", label: "Job Title", tab: 'work', width: 150, visible: true },
    { id: "department", label: "Department", tab: 'work', width: 150, visible: true },
    { id: "organization", label: "Organization", tab: 'work', width: 150, visible: true },

    { id: "web_page_1", label: "Web Page 1", tab: 'other', width: 150, visible: false },
    { id: "web_page_2", label: "Web Page 2", tab: 'other', width: 150, visible: false },
    { id: "birth_year", label: "Birth Year", tab: 'other', width: 100, visible: false },
    { id: "birth_month", label: "Birth Month", tab: 'other', width: 100, visible: false },
    { id: "birth_day", label: "Birth Day", tab: 'other', width: 100, visible: false },
    { id: "custom_1", label: "Custom 1", tab: 'other', width: 120, visible: false },
    { id: "custom_2", label: "Custom 2", tab: 'other', width: 120, visible: false },
    { id: "custom_3", label: "Custom 3", tab: 'other', width: 120, visible: false },
    { id: "custom_4", label: "Custom 4", tab: 'other', width: 120, visible: false },
    { id: "notes", label: "Notes", tab: 'other', width: 250, visible: true }
];

const TABS = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contact', label: 'Phones' },
    { id: 'work', label: 'Work' },
    { id: 'address', label: 'Addresses' },
    { id: 'other', label: 'Other & Notes' }
];

const app = createApp({
    setup() {
        const contacts = ref([]);
        const selectedIds = ref(new Set());
        const searchQuery = ref('');
        const currentPage = ref(1);
        const itemsPerPage = ref(50);
        const sortConfig = reactive({ key: 'first_name', direction: 'asc' });

        // UI State
        const isModalOpen = ref(false);
        const editingId = ref(null);
        const formData = ref({});
        const formErrors = ref({});
        const showColumnDropdown = ref(false);
        const activeTab = ref('basic');

        // Toast System
        const toasts = ref([]);
        let toastId = 0;

        // Fields Configuration (with LocalStorage persistence for user preferences)
        const fieldsConfig = ref([]);

        const initFieldsConfig = () => {
            const savedConfig = localStorage.getItem('contactsAppConfig');
            if (savedConfig) {
                try {
                    const parsed = JSON.parse(savedConfig);
                    // Merge saved width and visibility with schema
                    fieldsConfig.value = FIELDS_SCHEMA.map(f => {
                        const savedField = parsed.find(pf => pf.id === f.id);
                        return savedField ? { ...f, width: savedField.width, visible: savedField.visible } : f;
                    });
                } catch(e) {
                    fieldsConfig.value = JSON.parse(JSON.stringify(FIELDS_SCHEMA));
                }
            } else {
                fieldsConfig.value = JSON.parse(JSON.stringify(FIELDS_SCHEMA));
            }
        };

        const saveFieldsConfig = () => {
            localStorage.setItem('contactsAppConfig', JSON.stringify(
                fieldsConfig.value.map(f => ({ id: f.id, width: f.width, visible: f.visible }))
            ));
        };

        // Resizing Logic
        const startResize = (event, field) => {
            event.preventDefault();
            const startX = event.clientX;
            const startWidth = field.width;

            const doDrag = (e) => {
                const newWidth = startWidth + e.clientX - startX;
                if (newWidth > 50) { // Min width
                    field.width = newWidth;
                }
            };

            const stopDrag = () => {
                document.removeEventListener('mousemove', doDrag);
                document.removeEventListener('mouseup', stopDrag);
                saveFieldsConfig();
            };

            document.addEventListener('mousemove', doDrag);
            document.addEventListener('mouseup', stopDrag);
        };


        const addToast = (message, type = 'success') => {
            const id = toastId++;
            toasts.value.push({ id, message, type });
            setTimeout(() => removeToast(id), 3000);
        };

        const removeToast = (id) => {
            toasts.value = toasts.value.filter(t => t.id !== id);
        };

        // Fetch & LocalStorage Fallback
        const loadContacts = async () => {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                contacts.value = data;
                localStorage.setItem('contactsDataBackup', JSON.stringify(data));
            } catch (error) {
                console.error("Failed to fetch from API, falling back to LocalStorage:", error);
                const backup = localStorage.getItem('contactsDataBackup');
                if (backup) {
                    contacts.value = JSON.parse(backup);
                    addToast('Backend unreachable. Loaded from local backup.', 'error');
                } else {
                    addToast('Failed to connect to server.', 'error');
                }
            }
        };

        // Computed
        const visibleFields = computed(() => fieldsConfig.value.filter(f => f.visible));

        const filteredAndSortedContacts = computed(() => {
            let result = contacts.value;

            if (searchQuery.value) {
                const q = searchQuery.value.toLowerCase();
                result = result.filter(c => {
                    return Object.values(c).some(val =>
                        String(val).toLowerCase().includes(q)
                    );
                });
            }

            if (sortConfig.key) {
                result.sort((a, b) => {
                    let valA = (a[sortConfig.key] || '').toString().toLowerCase();
                    let valB = (b[sortConfig.key] || '').toString().toLowerCase();
                    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }
            return result;
        });


        const totalPages = computed(() => Math.ceil(filteredAndSortedContacts.value.length / itemsPerPage.value));
        const paginationStart = computed(() => (currentPage.value - 1) * itemsPerPage.value);
        const paginationEnd = computed(() => paginationStart.value + itemsPerPage.value);

        const paginatedContacts = computed(() => {
            return filteredAndSortedContacts.value.slice(paginationStart.value, paginationEnd.value);
        });

        const isAllSelected = computed(() => {
            return paginatedContacts.value.length > 0 &&
                   paginatedContacts.value.every(c => selectedIds.value.has(c.id));
        });

        const isIndeterminate = computed(() => {
            const selectedCount = paginatedContacts.value.filter(c => selectedIds.value.has(c.id)).length;
            return selectedCount > 0 && selectedCount < paginatedContacts.value.length;
        });

        const formTabs = TABS;
        const currentTabFields = computed(() => fieldsConfig.value.filter(f => f.tab === activeTab.value));

        // Methods
        const handleSort = (key) => {
            if (sortConfig.key === key) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortConfig.key = key;
                sortConfig.direction = 'asc';
            }
        };

        const toggleSelect = (id) => {
            const newSet = new Set(selectedIds.value);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            selectedIds.value = newSet;
        };

        const toggleSelectAll = (e) => {
            const newSet = new Set(selectedIds.value);
            if (e.target.checked) {
                paginatedContacts.value.forEach(c => newSet.add(c.id));
            } else {
                paginatedContacts.value.forEach(c => newSet.delete(c.id));
            }
            selectedIds.value = newSet;
        };

        const openModal = (id = null) => {
            editingId.value = id;
            formErrors.value = {};
            activeTab.value = 'basic';

            if (id) {
                const contact = contacts.value.find(c => c.id === id);
                formData.value = { ...contact };
            } else {
                formData.value = {};
                FIELDS_SCHEMA.forEach(f => formData.value[f.id] = '');
            }
            isModalOpen.value = true;
        };

        const closeModal = () => {
            isModalOpen.value = false;
        };

        const handleEditSelected = () => {
            if (selectedIds.value.size === 1) {
                openModal(Array.from(selectedIds.value)[0]);
            }
        };

        const validateForm = () => {
            formErrors.value = {};
            let isValid = true;

            const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
            if (formData.value.primary_email && !emailRegex.test(formData.value.primary_email)) {
                formErrors.value.primary_email = 'Invalid email format';
                isValid = false;
            }
            if (formData.value.secondary_email && !emailRegex.test(formData.value.secondary_email)) {
                formErrors.value.secondary_email = 'Invalid email format';
                isValid = false;
            }

            if(!isValid) {
                addToast('Please fix the errors before saving', 'error');
                // Auto switch to basic tab if error is there
                if(formErrors.value.primary_email || formErrors.value.secondary_email) activeTab.value = 'basic';
            }

            return isValid;
        };

        const saveContact = async () => {
            if (!validateForm()) return;

            try {
                if (editingId.value) {
                    const response = await fetch(`${API_URL}/${editingId.value}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData.value)
                    });
                    if (response.ok) {
                        addToast('Contact updated successfully');
                    } else throw new Error('Update failed');
                } else {
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData.value)
                    });
                    if (response.ok) {
                        addToast('Contact added successfully');
                    } else throw new Error('Add failed');
                }
                closeModal();
                loadContacts();
            } catch (e) {
                console.error(e);
                addToast('Failed to save contact', 'error');
            }
        };

        const handleDelete = async () => {
            if (selectedIds.value.size === 0) return;

            const count = selectedIds.value.size;
            // Removed native confirm as requested, replacing with a simple custom UI or direct action.
            // For safety, we will just delete, usually a custom modal is better but for this scope we execute.

            try {
                const response = await fetch(`${API_URL}/batch`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedIds.value) })
                });

                if (response.ok) {
                    addToast(`Deleted ${count} contact(s)`);
                    selectedIds.value.clear();
                    loadContacts();
                } else throw new Error('Delete failed');
            } catch (e) {
                console.error(e);
                addToast('Failed to delete contacts', 'error');
            }
        };

        const handleMerge = async () => {
            if (selectedIds.value.size < 2) return;

            const selected = contacts.value.filter(c => selectedIds.value.has(c.id));
            let mergedData = {};
            let idsToDelete = Array.from(selectedIds.value);

            FIELDS_SCHEMA.forEach(field => {
                let firstNonEmpty = '';
                selected.forEach(c => {
                    const val = (c[field.id] || '').trim();
                    if (!firstNonEmpty && val !== '') firstNonEmpty = val;
                });
                mergedData[field.id] = firstNonEmpty;
            });

            try {
                // Delete old ones
                await fetch(`${API_URL}/batch`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idsToDelete })
                });

                // Add merged one
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mergedData)
                });

                addToast('Contacts merged successfully');
                selectedIds.value.clear();
                loadContacts();
            } catch (e) {
                console.error(e);
                addToast('Merge operation failed', 'error');
            }
        };

        const handleImport = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async function(results) {
                    if (results.data && results.data.length > 0) {
                        const newContacts = results.data.map(row => {
                            const c = {};
                            // Map existing fields based on label or id
                            FIELDS_SCHEMA.forEach(f => {
                                // Support matching by Label from original export, or by ID
                                c[f.id] = row[f.label] || row[f.id] || '';
                            });
                            return c;
                        });

                        try {
                            const res = await fetch(`${API_URL}/batch`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newContacts)
                            });
                            if (res.ok) {
                                addToast(`Imported ${newContacts.length} contacts`);
                                loadContacts();
                            }
                        } catch(e) {
                            console.error(e);
                            addToast('Import failed to save to server', 'error');
                        }
                    }
                    event.target.value = '';
                }
            });
        };

        const handleExport = () => {
            if (filteredAndSortedContacts.value.length === 0) {
                addToast('No contacts to export', 'error');
                return;
            }

            const exportData = filteredAndSortedContacts.value.map(c => {
                let cleanData = {};
                FIELDS_SCHEMA.forEach(f => cleanData[f.label] = c[f.id]);
                return cleanData;
            });

            const csv = Papa.unparse(exportData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'contacts_export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast('Contacts exported successfully');
        };

        // Watch for config changes
        Vue.watch(fieldsConfig, saveFieldsConfig, { deep: true });
        Vue.watch(searchQuery, () => { currentPage.value = 1; });

        onMounted(() => {
            initFieldsConfig();
            loadContacts();
        });

        return {
            contacts, selectedIds, searchQuery, sortConfig, currentPage, itemsPerPage, totalPages, paginationStart, paginationEnd, paginatedContacts,
            isModalOpen, editingId, formData, formErrors, showColumnDropdown,
            toasts, fieldsConfig, visibleFields, filteredAndSortedContacts,
            isAllSelected, isIndeterminate, formTabs, currentTabFields, activeTab,
            handleSort, toggleSelect, toggleSelectAll, openModal, closeModal,
            handleEditSelected, saveContact, handleDelete, handleMerge,
            handleImport, handleExport, removeToast, startResize
        };
    }
});



app.mount('#app');
