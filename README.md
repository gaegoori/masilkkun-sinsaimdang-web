# masilkkun-sinsaimdang-web

## 프로젝트 소개

`masilkkun-sinsaimdang-web`은 여행지 코스와 장소 정보를 공유하고 탐색할 수 있는 웹 서비스입니다.

사용자는 지역과 태그를 기준으로 게시글을 조회할 수 있으며, 게시글 상세 페이지에서 코스 정보를 확인할 수 있습니다.  
또한 게시글 작성, 수정, 마이페이지, 스크랩북, 프로필 페이지 등의 기능을 제공하며, 지도 영역과 게시글 UI를 함께 보여주는 구조로 구현되었습니다.

## 🚀 배포 링크

https://masilkkun-sinsaimdang-web-seven.vercel.app

## 🛠️ 기술 스택

- React
- Vite
- JavaScript
- CSS
- React Router DOM
- Axios
- React Icons
- pnpm
- Vercel

## ✨ 주요 기능

- 게시글 목록 조회
- 지역 기반 필터링
- 태그 기반 필터링
- 좋아요 및 스크랩 기능
- 게시글 상세 페이지 조회
- 게시글 작성 및 수정
- 마이페이지
- 프로필 페이지
- 스크랩북
- 인증하기 페이지
- 지도 기반 장소 선택 및 표시
- 로그인 / 회원가입 모달
- JWT 기반 API 요청 처리

## 📁 프로젝트 구조


```bash
.
├── public                         # 정적 파일 (이미지 등)
│   ├── default-image.png          # 게시글 기본 이미지
│   └── default-profile.png        # 프로필 기본 이미지
│
├── src
│   ├── api
│   │   └── baseApi.jsx            # axios 설정 및 토큰 인터셉터 처리
│   │
│   ├── assets                     # 이미지 및 기타 정적 리소스
│   │
│   ├── components
│   │   ├── layout                 # 레이아웃 관련 컴포넌트
│   │   │   ├── Sidebar.jsx        # 좌측 사이드바 UI
│   │   │   ├── Region.jsx         # 지역 선택 UI
│   │   │   ├── LoginRegisterModal.jsx # 로그인/회원가입 모달
│   │   │   └── Layout.css         # 전체 레이아웃 스타일
│   │   │
│   │   ├── main
│   │   │   └── Mapview.jsx        # 지도 영역 컴포넌트
│   │   │
│   │   └── post                   # 게시글 관련 컴포넌트
│   │       ├── PostList.jsx       # 게시글 리스트 렌더링
│   │       ├── PostCard.jsx       # 게시글 카드 UI
│   │       ├── CategoryFilter.jsx # 태그/카테고리 필터
│   │       └── *.css              # 게시글 관련 스타일
│   │
│   ├── context
│   │   └── CategoryContext.jsx    # 카테고리 전역 상태 관리
│   │
│   ├── pages                      # 라우팅 단위 페이지
│   │   ├── PostListPage.jsx       # 게시글 목록 페이지
│   │   ├── PostCreatePage.jsx     # 게시글 작성 페이지
│   │   ├── PostEditPage.jsx       # 게시글 수정 페이지
│   │   ├── PostCoursePage.jsx     # 게시글 상세/코스 페이지
│   │   ├── CertificationPage.jsx  # 인증하기 페이지
│   │   ├── ScrapbookPage.jsx      # 스크랩북 페이지
│   │   ├── MyPage.jsx             # 마이페이지
│   │   ├── ProfilePage.jsx        # 사용자 프로필 페이지
│   │   └── *.css                  # 각 페이지 스타일
│   │
│   ├── App.jsx                    # 전체 라우팅 및 레이아웃 구성
│   ├── App.css                    # 전역 스타일
│   ├── index.css                  # 기본 스타일
│   └── main.jsx                   # React 진입점
│
├── .env                           # 환경 변수 (API URL 등)
├── .gitignore                     # git 제외 파일 목록
├── index.html                     # HTML 템플릿
├── package.json                   # 프로젝트 설정 및 의존성
├── pnpm-lock.yaml                 # 패키지 버전 고정
├── vite.config.js                 # Vite 설정
└── README.md                      # 프로젝트 설명
