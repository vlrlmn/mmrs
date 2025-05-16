import ms from 'ms';

function stringToSeconds(input: string): number
{
    const valueInMs = ms(input as ms.StringValue);
    if (valueInMs === undefined) {
        throw new Error('Invalid expiration value in .env');
    }
    const valueInSec = Math.floor(valueInMs / 1000);
    return valueInSec;
}

export {
	stringToSeconds
}