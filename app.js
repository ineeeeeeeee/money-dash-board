fetch('https://script.google.com/macros/s/AKfycbxpbx3Ky5AIEmy0QrVMl8-ww8VyUniahcwUujFOfcIkYlSOb5vLkKg86HyiS8s6Uo47/exec')
  .then(response => response.json())
  .then(data => {
    // data 변수에 시트 데이터가 배열로 들어옴
    // 이 데이터를 기존 분석/차트 함수에 맞게 가공
    // 예: 소비자, 월, 카테고리별로 집계
  });

function groupByConsumerMonthCategory(data) {
  const result = {};
  data.forEach(row => {
    const consumer = row['소비자'];
    const month = row['날짜'].slice(0,7); // yyyy-mm
    const category = row['카테고리'];
    const amount = Number(row['금액(원)']) || 0;
    if (!result[consumer]) result[consumer] = {};
    if (!result[consumer][month]) result[consumer][month] = {};
    if (!result[consumer][month][category]) result[consumer][month][category] = 0;
    result[consumer][month][category] += amount;
  });
  return result;
}
