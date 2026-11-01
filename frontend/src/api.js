import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const getHealth = () => api.get('/health');
export const getDashboardStats = (params) => api.get('/dashboard/stats', { params });
export const uploadDocument = (formData) => api.post('/documents/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const testSampleDocument = (sampleName) => api.post(`/documents/test-sample/${sampleName}`);
export const runSampleExtraction = (sampleName) => api.post(`/documents/test-sample/${sampleName}`);
export const getRecords = (params) => api.get('/records', { params });
export const getRecordById = (id) => api.get(`/records/${id}`);
export const updateRecord = (id, data) => api.put(`/records/${id}`, data);
export const getValidationIssues = (params) => api.get('/validation/issues', { params });
export const resolveIssue = (id) => api.post(`/validation/issues/${id}/resolve`);
export const getDuplicates = () => api.get('/duplicates');
export const resolveDuplicate = (id, action) => api.post(`/duplicates/${id}/resolve?action=${action}`);
export const getMismatches = () => api.get('/mismatches');
export const resolveMismatch = (id) => api.post(`/mismatches/${id}/resolve`);
export const generateAuditReport = (recordId) => api.post(`/reports/generate/${recordId}`);

// 📍 Location Hierarchy APIs (Karnataka: Davanagere, Tumakuru, Shivamogga, Mysuru)
export const getDistricts = () => api.get('/locations/districts');
export const getTaluks = (districtName) => api.get('/locations/taluks', { params: { district_name: districtName } });
export const getHoblis = (talukName) => api.get('/locations/hoblis', { params: { taluk_name: talukName } });
export const getVillages = (hobliName) => api.get('/locations/villages', { params: { hobli_name: hobliName } });

// 📚 Reference Dataset Management
export const getReferenceParcels = (params) => api.get('/reference/parcels', { params });
export const importReferenceCsv = (formData) => api.post('/reference/import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const importReferenceParcels = importReferenceCsv;
export const getReferenceTemplateUrl = () => '/api/reference/template.csv';

// 🔍 Verification Engine APIs
export const getVerificationResult = (documentId) => api.get(`/verification/results/${documentId}`);
export const getAllVerifications = (params) => api.get('/verification/all', { params });

// GIS & Satellite Boundary Integration (Cadastral Land Ownership & District Coverage)
export const getGisParcels = () => api.get('/gis/parcels');
export const getLandLocations = () => api.get('/land/locations');
export const searchLandParcels = (params) => api.get('/land/parcels/search', { params });
export const getLandParcelById = (id) => api.get(`/land/parcels/${id}`);
export const identifyParcelByPolygon = (polygonGeoJson) => api.post('/land/parcels/identify', { polygon: polygonGeoJson });
export const getLandParcelRecords = (id) => api.get(`/land/parcels/${id}/records`);
export const getDistrictBoundary = (districtName) => api.get(`/land/boundaries/district/${districtName}`);
export const getAllDistrictBoundaries = () => api.get('/land/boundaries/all');
export const searchPlaces = (query) => api.get('/land/search/places', { params: { q: query } });
export const getCoverageMetadata = () => api.get('/land/coverage/metadata');
export const getOsmBuildings = (params) => api.get('/land/buildings/osm', { params });
export const importGeojsonBoundary = (formData) => api.post('/land/parcels/import-geojson', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const createLandParcel = (parcelData) => api.post('/land/parcels', parcelData);
export const updateLandParcel = (id, parcelData) => api.put(`/land/parcels/${id}`, parcelData);
export const deleteLandParcel = (id) => api.delete(`/land/parcels/${id}`);
export const lookupSurveyParcel = (params) => api.get('/land/parcels/survey-lookup', { params });
export const importCadastralDataset = (formData) => api.post('/land/parcels/import-cadastral', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getUserDrawnParcels = () => api.get('/land/parcels/user-drawings');
export const importSampleCadastralDataset = () => api.post('/land/parcels/import-sample-cadastral');


// Blockchain Mutation Ledger
export const getBlockchainBlocks = () => api.get('/blockchain/blocks');
export const verifyBlockchain = () => api.post('/blockchain/verify');

// Field Revenue Inspector Mobile
export const submitFieldInspection = (data) => api.post('/inspections/submit', data);
export const getInspectionLogs = (recordId) => api.get(`/inspections/record/${recordId}`);

// 💬 BhoomiAI Intelligent Assistant (ChatGPT-like AI Chatbot)
export const getChatStatus = () => api.get('/chat/status');
export const getChatConversations = () => api.get('/chat/conversations');
export const getChatConversationDetail = (id) => api.get(`/chat/conversations/${id}`);
export const deleteChatConversation = (id) => api.delete(`/chat/conversations/${id}`);
export const clearAllChatConversations = () => api.post('/chat/conversations/clear');

export default api;
