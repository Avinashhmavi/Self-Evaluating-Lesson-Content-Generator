# Gates

- [x] G1: Offline tests pass
  CHECK: .venv/bin/python -m pytest backend/tests -q
  EXPECT: 8 passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=10fc9d0043f58a23646d808c350233410654ab52df327268f2e7bfdcafc16e14; exit=0; EXPECT=matched; output-sha256=79e0af43ebc1f2cf09ce17214f50f26ea032a2489d8fc169cecc9af4ce03f0b4; output-bytes=98; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
- [x] G2: Frontend builds
  CHECK: cd frontend && npx vite build
  EXPECT: built in
  EVIDENCE: automatic-evidence=v1; definition-sha256=a216b7774dad3fb7ab7cd6143d02b030863814a11b073a12b2bcc6b0cf2ce484; exit=0; EXPECT=matched; output-sha256=7becf8ca919db383851d3dba40f828985bace5ab55b4972ae61ed6afe42de5ae; output-bytes=352; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
- [x] G3: API serves rubric with 11 checks
  CHECK: .venv/bin/python -c "import sys; sys.path.insert(0,'backend'); from fastapi.testclient import TestClient; import api; print('N=', len(TestClient(api.app).get('/api/rubric').json()['checks']))"
  EXPECT: N= 12
  EVIDENCE: automatic-evidence=v1; definition-sha256=9509e3ad3550a4841f1960ef6b391c75638e3615ad8199a4259ece8ef8831b0f; exit=0; EXPECT=matched; output-sha256=adde00efa1bc0a432574fa881f7671de8bcdd17003902acda980af4fe5d40477; output-bytes=6; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
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
- [x] G7: The MCP run after the topic fix is about MCP, not RAG
  CHECK: .venv/bin/python -c "import sys; sys.path.insert(0,'backend'); import memory, re; t=memory.get_run(10)['lesson']; print('MCP_OK' if len(re.findall('MCP|Model Context Protocol', t))>5 and not re.search(r'\\bRAG\\b', t) else 'BAD')"
  EXPECT: MCP_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=482def82e2c4d9f3380617ed8b3e44f5cfd894c90142a00cba18fa879ebfb24e; exit=0; EXPECT=matched; output-sha256=0166f0df1a1c7989eeed7531fbc08d4267d506c6e2ea4b389c34b5b7b72352f3; output-bytes=7; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
- [x] G8: The planted-error run on the new code caught the false fact and then passed
  CHECK: sqlite3 backend/data/memory.db "select (select count(*) from fails where run_id=11 and attempt=1 and check_id='J1') || '-' || (select status from runs where id=11)"
  EXPECT: 1-PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=3c8b5f9f34360ff9d26d871974b68f64f4ad30fe6978617cde24b177dc114131; exit=0; EXPECT=matched; output-sha256=7977e30b8f27b263728bddceeaf218c426cb97797fcaabc423e5d75d099442ed; output-bytes=9; shell=/bin/sh; cwd=/Users/avi/Downloads/Self-Evaluating Lesson Content Generator; path=4d008f6c2e47/36 entries
