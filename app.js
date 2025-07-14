// 구글 Apps Script에서 발급받은 JSON API URL로 교체하세요
const API_URL = 'https://script.google.com/macros/s/AKfycbxpbx3Ky5AIEmy0QrVMl8-ww8VyUniahcwUujFOfcIkYlSOb5vLkKg86HyiS8s6Uo47/exec';

// 차트 색상 등은 기존 코드와 동일하게 사용
const chartColors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
let charts = {};
let currentConsumer = '';
let currentMonth = '';
let rawData = [];
let consumers = [];
let months = [];
let categories = [];

// DOM 로드 시 데이터 불러오기
document.addEventListener('DOMContentLoaded', function() {
  fetch(API_URL)
    .then(response => response.json())
    .then(data => {
      rawData = data;
      consumers = [...new Set(rawData.map(r => r['소비자']))];
      months = [...new Set(rawData.map(r => r['날짜'].slice(0,7)))];
      categories = [...new Set(rawData.map(r => r['카테고리']))];
      initializeDropdowns();
      initializeEventListeners();
    })
    .catch(err => {
      alert('데이터 불러오기 실패: ' + err);
    });
});

// 드롭다운 초기화
function initializeDropdowns() {
  const consumerSelect = document.getElementById('consumerSelect');
  const monthSelect = document.getElementById('monthSelect');
  consumerSelect.innerHTML = '<option value="">소비자 선택</option>';
  consumers.forEach(consumer => {
    const option = document.createElement('option');
    option.value = consumer;
    option.textContent = consumer;
    consumerSelect.appendChild(option);
  });
  monthSelect.innerHTML = '<option value="">월 선택</option>';
  months.forEach(month => {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = month.replace('-', '년 ') + '월';
    monthSelect.appendChild(option);
  });
}

function initializeEventListeners() {
  document.getElementById('consumerSelect').addEventListener('change', handleSelectionChange);
  document.getElementById('monthSelect').addEventListener('change', handleSelectionChange);
}

function handleSelectionChange() {
  currentConsumer = document.getElementById('consumerSelect').value;
  currentMonth = document.getElementById('monthSelect').value;
  if (currentConsumer && currentMonth) {
    updateAnalysis();
  }
}

// 분석 및 차트 갱신
function updateAnalysis() {
  // 선택한 소비자/월의 데이터만 필터링
  const filtered = rawData.filter(r => r['소비자'] === currentConsumer && r['날짜'].startsWith(currentMonth));
  if (filtered.length === 0) {
    alert('해당 데이터가 없습니다.');
    return;
  }
  // 총지출, 고정/변동지출, 카테고리별 합계 계산
  let total = 0, fixed = 0, variable = 0;
  let categorySum = {};
  let dailyExpense = Array(31).fill(0);
  filtered.forEach(r => {
    const amount = Number(r['금액(원)']) || 0;
    total += amount;
    if (r['고정지출 여부'] === 'O') fixed += amount;
    else variable += amount;
    const cate = r['카테고리'];
    if (!categorySum[cate]) categorySum[cate] = 0;
    categorySum[cate] += amount;
    const day = Number(r['날짜'].split('-')[2]);
    if (day) dailyExpense[day-1] += amount;
  });
  // 요약 정보 표시
  document.getElementById('totalExpense').textContent = formatCurrency(total);
  document.getElementById('fixedExpense').textContent = formatCurrency(fixed);
  document.getElementById('variableExpense').textContent = formatCurrency(variable);
  // 차트 갱신
  updateCategoryChart(categorySum);
  updateFixedVariableChart(fixed, variable);
  updateDailyChart(dailyExpense.slice(0, daysInMonth(currentMonth)));
  // 조언(패턴/카테고리/예산) 갱신
  updateAdvice(total, fixed, variable, categorySum);
}

// 차트 함수(예시, 기존 코드 재활용)
function updateCategoryChart(categories) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  if (charts.category) charts.category.destroy();
  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: chartColors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}
function updateFixedVariableChart(fixed, variable) {
  const ctx = document.getElementById('fixedVariableChart').getContext('2d');
  if (charts.fixedVariable) charts.fixedVariable.destroy();
  charts.fixedVariable = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['고정지출', '변동지출'],
      datasets: [{
        data: [fixed, variable],
        backgroundColor: [chartColors[0], chartColors[1]],
        borderColor: [chartColors[0], chartColors[1]],
        borderWidth: 1
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}
function updateDailyChart(dailyExpense) {
  const ctx = document.getElementById('dailyChart').getContext('2d');
  if (charts.daily) charts.daily.destroy();
  const labels = dailyExpense.map((_, idx) => `${idx+1}일`);
  charts.daily = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '일별 지출',
        data: dailyExpense,
        borderColor: chartColors[0],
        backgroundColor: chartColors[0] + '20',
        fill: true,
        tension: 0.4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// 조언 예시(간단)
function updateAdvice(total, fixed, variable, categorySum) {
  // 패턴 분석
  const fixedRatio = total ? (fixed/total*100).toFixed(1) : 0;
  document.getElementById('patternAnalysis').innerHTML =
    `<b>고정지출 비율:</b> ${fixedRatio}%<br>` +
    (fixedRatio >= 40 ? '고정지출이 높아요! 구조 점검 필요' : '고정지출 관리 양호');
  // 카테고리별 평가
  let evalHtml = '';
  for (let cate in categorySum) {
    const ratio = total ? (categorySum[cate]/total*100).toFixed(1) : 0;
    let level = 'low';
    if (ratio >= 30) level = 'high';
    else if (ratio >= 15) level = 'medium';
    evalHtml += `<div><b>${cate}</b>: ${ratio}% - <span class="level-${level}">${categoryAdvice(cate, level)}</span></div>`;
  }
  document.getElementById('categoryEvaluation').innerHTML = evalHtml;
  // 예산 제안(50/30/20 룰 예시)
  document.getElementById('budgetSuggestion').innerHTML =
    `<b>권장 예산(식비 15%, 교통비 10% 등)</b> 등 맞춤 안내 표시`;
}

// 카테고리별 조언(간단 예시)
function categoryAdvice(category, level) {
  const advice = {
    high: '지출이 높아요. 절약 필요!',
    medium: '적정 수준입니다.',
    low: '잘 관리되고 있습니다.'
  };
  return advice[level] || '';
}

// 유틸 함수
function formatCurrency(num) {
  return num.toLocaleString('ko-KR') + '원';
}
function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
