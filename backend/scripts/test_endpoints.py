import httpx
import sys

sys.stdout.reconfigure(encoding='utf-8')

r = httpx.get('http://127.0.0.1:8000/api/documents/samples')
print('GET /api/documents/samples STATUS:', r.status_code)
for s in r.json():
    print(f"  {s['id']} -> {s['name']} | Sy: {s['survey_number']} | Owner: {s['owner']}")

# Test 1-click test sample for user_pani_1
r1 = httpx.post('http://127.0.0.1:8000/api/documents/test-sample/user_pani_1')
print('\nPOST test-sample/user_pani_1 STATUS:', r1.status_code)
data1 = r1.json()
print('  Doc ID:', data1.get('document_id'))
print('  Survey No:', data1.get('extracted_fields', {}).get('survey_number'))
print('  Village:', data1.get('extracted_fields', {}).get('village'))
print('  Owner:', data1.get('extracted_fields', {}).get('owner_name'))
print('  Verification Status:', data1.get('verification_result', {}).get('final_status'))
print('  Discrepancy:', data1.get('verification_result', {}).get('discrepancy_score'))

# Test 1-click test sample for user_pani_2
r2 = httpx.post('http://127.0.0.1:8000/api/documents/test-sample/user_pani_2')
print('\nPOST test-sample/user_pani_2 STATUS:', r2.status_code)
data2 = r2.json()
print('  Doc ID:', data2.get('document_id'))
print('  Survey No:', data2.get('extracted_fields', {}).get('survey_number'))
print('  Village:', data2.get('extracted_fields', {}).get('village'))
print('  Owner:', data2.get('extracted_fields', {}).get('owner_name'))
print('  Verification Status:', data2.get('verification_result', {}).get('final_status'))
print('  Discrepancy:', data2.get('verification_result', {}).get('discrepancy_score'))
