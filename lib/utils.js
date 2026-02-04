function isNonEmptyString(e){
    const is = e && typeof e === 'string' && e.trim().length > 0;
    return is;
}

function isPositiveInt(e){
    const is = e && Number.isInteger(e) && e > 0;
    return is;
}

export default {
    isNonEmptyString,
    isPositiveInt
}