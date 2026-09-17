# 데이터 출처 / 기준일

기준일: **2026-09-17 (KST)**

이 프로젝트는 실시간 API를 호출하지 않습니다. 아래 공개 정보를 확인한 뒤 필요한 노선/역 정보를 정적 데이터로 포함합니다.

## 서울 간선버스

- 서울 열린데이터광장 — 서울시 버스 노선 정보 조회
  - https://data.seoul.go.kr/dataList/OA-1095/L/1/datasetView.do
  - 2026-09-02 갱신 파일: `서울시버스노선별정류소정보(20260902).xlsx`
  - 서울특별시 / 공공누리 1유형
- 서울특별시 버스 API 기반 노선 순서 확인
  - 160: https://info.koreacharts.com/citybus/seoul/route/100100033/contents.html
  - 나머지 지원 노선도 동일한 서울시 버스 API 기반 최신 운행정보와 대조

현재 앱에는 사용 빈도가 높은 **주요 정류장**을 선별해 포함합니다. 좌표 간 선분은 햇빛 방향 계산용 대표 geometry입니다. 실제 도로의 모든 굴곡, 일방통행 우회, 정류장 반대편 위치 차이는 포함하지 않습니다.

지원: `160`, `148`, `121`, `152`, `273`

## KTX / KTX-이음

- 한국철도공사(코레일) 운행노선 안내
  - https://info.korail.com/
- 지원 운행계통
  - 경부선 KTX
  - 호남선 KTX
  - 전라선 KTX
  - 경전선 KTX
  - 강릉선 KTX-이음
  - 중앙선 KTX-이음

역 사이 시간은 실제 특정 열차번호의 시각표가 아니라 노선별 대표 평균속도와 정차 가중치로 계산합니다. 따라서 좌석 추천은 **사용자가 입력한 출발 예정 시각을 기준으로 이동 중 태양 위치를 근사**하기 위한 것이며 실제 도착시각 안내 서비스가 아닙니다.

## 태양 위치

- NOAA Global Monitoring Laboratory, General Solar Position Calculations
  - https://gml.noaa.gov/grad/solcalc/solareqns.PDF
  - https://gml.noaa.gov/grad/solcalc/

NOAA의 fractional year, equation of time, solar declination, true solar time, hour angle 식을 사용합니다. 한국 노선만 지원하므로 KST (`UTC+9`)를 명시적으로 적용합니다.

## 결과 해석

좌/우는 항상 **차량 진행방향을 바라보았을 때** 기준입니다.

현재 모델이 반영하는 항목:
- 날짜(계절)
- 시각
- 위치(위도/경도)
- 진행 방위각
- 이동 중 경과시간
- 태양 방위각
- 태양 고도
- 창문 방향에 대한 직달광 입사각

현재 모델이 반영하지 않는 항목:
- 건물 그림자
- 터널/방음벽/교량 구조물
- 차량별 차광필름/커튼
- 좌석 내부 구조에 의한 가림
- 구름/강수
- 실제 교통정체 또는 특정 KTX 열차의 정차패턴
