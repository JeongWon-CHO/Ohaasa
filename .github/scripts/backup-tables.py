#!/usr/bin/env python3
"""PostgREST로 전 테이블을 떠서 테이블별 JSONL로 저장한다.

pg_dump 대신 REST를 쓰는 이유: DB 비밀번호가 필요 없다. 이미 크롤러가 쓰는
service_role 키 하나로 끝나고, 그 키는 RLS를 우회하므로 anon에게 SELECT가 닫힌
테이블(question_answer_reports 등)까지 전부 담긴다.

한계: 스키마 DDL은 담기지 않는다. 데이터만 있는 백업이다.
복원 절차와 함께 CLAUDE.md "백업" 절 참고.
"""

import gzip
import json
import os
import sys
import urllib.error
import urllib.request

# db-max-rows(이 프로젝트는 1000)보다 작아야 "요청한 만큼 왔는가"로 다음 페이지
# 유무를 판정할 수 있다. 같거나 크면 서버 상한과 구분되지 않아 조용히 잘린다.
PAGE = 500

# (테이블, 정렬키). 정렬 없는 OFFSET은 페이지 간 행 순서를 보장하지 않아
# 중복·누락이 난다. 합성 PK인 테이블은 두 컬럼을 모두 준다.
TABLES = [
    ("horoscopes", "id"),
    ("user_devices", "id"),
    ("notification_log", "date"),
    ("question_answers", "id"),
    ("question_answer_likes", "answer_id,device_id"),
    ("question_answer_reports", "answer_id,device_id"),
    ("question_answer_replies", "id"),
    ("question_answer_reply_likes", "reply_id,device_id"),
    ("question_answer_reply_reports", "reply_id,device_id"),
]

# 비어 있으면 백업이 잘못된 것으로 보는 테이블. 나머지는 0행도 정상이다
# (아직 신고나 공감이 한 건도 없을 수 있다).
MUST_HAVE_ROWS = {"horoscopes", "user_devices"}


def fetch_page(base: str, key: str, table: str, order: str, offset: int) -> list:
    url = f"{base}/rest/v1/{table}?select=*&order={order}"
    req = urllib.request.Request(url)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Range-Unit", "items")
    req.add_header("Range", f"{offset}-{offset + PAGE - 1}")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.load(resp)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise SystemExit(f"::error::{table} 조회 실패 (HTTP {e.code}): {detail}")
    except Exception as e:  # noqa: BLE001 - 네트워크/파싱 무엇이든 백업 실패로 다룬다
        raise SystemExit(f"::error::{table} 조회 실패: {e}")

    # 에러 응답은 list가 아니라 {"message": ...} 형태로 온다. 이걸 빈 결과로
    # 흘려보내면 "0행짜리 정상 백업"으로 둔갑하므로 여기서 끊는다.
    if not isinstance(body, list):
        raise SystemExit(f"::error::{table} 응답이 배열이 아닙니다: {str(body)[:300]}")
    return body


def dump_table(base: str, key: str, table: str, order: str, outdir: str) -> int:
    path = os.path.join(outdir, f"{table}.jsonl")
    total = 0
    offset = 0
    with open(path, "w", encoding="utf-8") as f:
        while True:
            rows = fetch_page(base, key, table, order, offset)
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
            total += len(rows)
            if len(rows) < PAGE:
                break
            offset += PAGE
    return total


def main() -> None:
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    outdir = os.environ.get("OUTDIR", "backup")

    if not base or not key:
        raise SystemExit("::error::SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 비어 있습니다.")

    os.makedirs(outdir, exist_ok=True)
    counts = {}

    for table, order in TABLES:
        n = dump_table(base, key, table, order, outdir)
        counts[table] = n
        print(f"  {table:<32} {n:>6} rows")

    empty = sorted(t for t in MUST_HAVE_ROWS if counts.get(t, 0) == 0)
    if empty:
        raise SystemExit(f"::error::비어 있으면 안 되는 테이블이 0행입니다: {', '.join(empty)}")

    manifest = {"counts": counts, "page_size": PAGE, "tables": [t for t, _ in TABLES]}
    with open(os.path.join(outdir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # 파일 하나로 묶어 아티팩트를 단순하게 유지한다.
    archive = f"{outdir}.tar.gz"
    import tarfile

    with tarfile.open(archive, "w:gz") as tar:
        tar.add(outdir, arcname=os.path.basename(outdir))

    print(f"\n총 {sum(counts.values())}행 · {os.path.getsize(archive)} bytes → {archive}")


if __name__ == "__main__":
    main()
