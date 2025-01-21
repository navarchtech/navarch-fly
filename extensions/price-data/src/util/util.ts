// function to convert a Date object into YYYY-MM-DD format
export function formatDateYYYYMMDD(date: Date, withDashSeparator: boolean = true) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${year}${withDashSeparator ? '-' : ' '}${month < 10 ? '0' : ''}${month}${withDashSeparator ? '-' : ' '}${day < 10 ? '0' : ''}${day}`;
}