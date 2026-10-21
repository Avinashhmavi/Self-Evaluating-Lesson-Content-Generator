# Gates

- [x] G1: Offline tests pass
  CHECK: .venv/bin/python -m pytest backend/tests -q
  EXPECT: 5 passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=3d5f45bbc222200ef9a40d257839aa358c1c61db01b1f9b5e41ffe84f57ff6b6; exit=0; EXPECT=matched; output-sha256=1a959c9e52673ca43baa1f7cea87cf8b2229ee66d4fed73297fc84e9f8615985; output-bytes=98; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
- [x] G2: Frontend builds
  CHECK: cd frontend && npx vite build
  EXPECT: built in
  EVIDENCE: automatic-evidence=v1; definition-sha256=a216b7774dad3fb7ab7cd6143d02b030863814a11b073a12b2bcc6b0cf2ce484; exit=0; EXPECT=matched; output-sha256=7becf8ca919db383851d3dba40f828985bace5ab55b4972ae61ed6afe42de5ae; output-bytes=352; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
- [x] G3: API serves rubric with 11 checks
  CHECK: .venv/bin/python -c "import sys; sys.path.insert(0,'backend'); from fastapi.testclient import TestClient; import api; print('N=', len(TestClient(api.app).get('/api/rubric').json()['checks']))"
  EXPECT: N= 11
  EVIDENCE: automatic-evidence=v1; definition-sha256=d8b1fda1c74a3f431bb40e102f44dae8cf64c1045532397423a16a29632e6991; exit=0; EXPECT=matched; output-sha256=eb2bbca63cc684d315d0e67fb034459d72b2e763d3dae3396c83fd2a3bf4d99d; output-bytes=6; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
- [x] G4: A stored live run passed all 11 checks
  CHECK: sqlite3 backend/data/memory.db "select 'PASSED_RUNS=' || count(*) from runs where status='PASSED' and first_pass=1"
  EXPECT: PASSED_RUNS=1
  EVIDENCE: automatic-evidence=v1; definition-sha256=44d3de4a68b130ee14f0e03bad28dff07b30a7433e59b590652eed8b4ac0a111; exit=0; EXPECT=matched; output-sha256=300daa8b3ea7595d5086c0cb6ebd3ebabd08f9c2c39022cfe7b3534dde555e69; output-bytes=14; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
- [x] G5: Final lesson file has the five sections
  CHECK: grep -c "^## " docs/lesson_rag.md
  EXPECT: 5
  EVIDENCE: automatic-evidence=v1; definition-sha256=de00a25207b899746d9c920ace83b5532a06950bb241458349f7f5cf9ae1a20b; exit=0; EXPECT=matched; output-sha256=f0b5c2c2211c8d67ed15e75e656c7862d086e9245420892a7de62cd9ec582a06; output-bytes=2; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
- [x] G6: Rejection log of the error-injection run records the planted false claim
  CHECK: sqlite3 backend/data/memory.db "select count(*) from fails where run_id=3 and attempt=1 and check_id='J1'"
  EXPECT: 1
  EVIDENCE: automatic-evidence=v1; definition-sha256=d250966d9ee0440cc4107dfaae53561c76ff8b3d20baf9ebdada562dade72c60; exit=0; EXPECT=matched; output-sha256=4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865; output-bytes=2; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
