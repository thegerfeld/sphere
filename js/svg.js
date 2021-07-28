function calculateIntersection(diskRadius, coneSectionRadius, coneVerticalOffset) {
    if(diskRadius > coneVerticalOffset + coneSectionRadius) {
        return {
            diskArc: 2 * Math.PI,
            coneSectionArc: 2 * Math.PI
        };
    } else if(diskRadius + coneSectionRadius <= coneVerticalOffset) {
        return {
            diskArc: 2 * Math.PI
        }
    } else {
        const yAxis = (Math.pow(coneVerticalOffset, 2) + Math.pow(diskRadius, 2) - Math.pow(coneSectionRadius, 2)) / (2 * coneVerticalOffset),
            diskIntersectionArc = Math.acos(yAxis / diskRadius),
            xAxis = diskRadius * Math.sin(diskIntersectionArc),
            coneSectionIntersectionArc = Math.acos((coneVerticalOffset - yAxis) / coneSectionRadius),
            diskArc = 2 * Math.PI - 2 * diskIntersectionArc,
            coneSectionArc = coneSectionIntersectionArc <= Math.PI / 2
                    ? 2 * coneSectionIntersectionArc
                    : 2 * Math.PI - 2 * coneSectionIntersectionArc;
        return {
            xAxis: xAxis,
            yAxis: yAxis,
            diskArc: diskArc,
            coneSectionArc: coneSectionArc
        };
    }
}

function diskDimensions(normalizedParameters) {
    const p = normalizedParameters,
        sphereSections = p.sphereDisks + 1,
        diskHorizontalOffset = 2 * p.sphereRadius / sphereSections,
        result = [];
    for (let i = 0; i < sphereSections - 1; i++) {
        const diskXOffset = (i + 1) * diskHorizontalOffset,
            diskXAxis = p.sphereRadius - diskXOffset,
            diskRadius = diskXAxis == 0 ? p.sphereRadius : Math.sqrt(Math.pow(p.sphereRadius, 2) - Math.pow(Math.abs(diskXAxis), 2)),
            coneSectionRadius = p.coneRadius * (p.coneLength - (diskXOffset + (p.coneLength - 2 * p.sphereRadius) / 2)) / p.coneLength,
            intersection = calculateIntersection(diskRadius, coneSectionRadius, normalizedParameters.coneVerticalOffset),
            diskDimension = {
                diskRadius: diskRadius,
                diskDrillRadius: p.sphereDrillRadius,
                coneSectionRadius: coneSectionRadius,
                coneSectionVerticalOffset: p.coneVerticalOffset,
                diskArc: intersection.diskArc,
                coneSectionArc: intersection.coneSectionArc
            };
        if(diskDimension.diskArc < 2 * Math.PI) {
            diskDimension.intersection = {x: intersection.xAxis, y: intersection.yAxis};
        }
        result.push(diskDimension);
    }

    const hexInnerRadius = p.sphereRadius + 2, //result.map(dd => dd.diskRadius).reduce((a, b) => a + b, 0) / result.length,
        hexOuterRadius = 2 / Math.sqrt(3) * hexInnerRadius,
        hexesPerLongRow = Math.floor(p.plateWidth / (2 * hexInnerRadius)),
        hexesPerTwoRows = 2 * hexesPerLongRow - 1,
        hexCenter = function (idx) {
            const longRow = idx % hexesPerTwoRows < hexesPerLongRow,
                doubleRow = Math.floor(idx / hexesPerTwoRows),
                row = 2 * doubleRow + (longRow ? 0 : 1),
                column = idx % hexesPerTwoRows - (longRow ? 0 : hexesPerLongRow),
                center = {
                    x: hexInnerRadius + column * 2 * hexInnerRadius,
                    y: hexOuterRadius + row * 1.5 * hexOuterRadius
                };
            if(!longRow) {
                center.x += hexInnerRadius;
            }
            return center;
        };
    result.sort((a, b) => a.diskRadius - b.diskRadius);    
    for(let i = 0; i < Math.ceil(result.length / 2); i++) {
        const j = result.length - 1 - i;
        result[i].hexCenter = hexCenter(2 * i);
        if(i != j) {
            result[j].hexCenter = hexCenter(2 * i + 1);
        }            
    }
    return result;
}

function describeDisk(diskDimensions) {
    const dd = diskDimensions;
    const di = dd.intersection;
    return [
        "M", di.x, -di.y, '\n',
        "A", dd.diskRadius, dd.diskRadius, 0, 0, 1, 0, dd.diskRadius, '\n',
        "A", dd.diskRadius, dd.diskRadius, 0, 0, 1, -di.x, -di.y, '\n',
        "A", dd.coneSectionRadius, dd.coneSectionRadius, 0, 0, 0, 0, -(dd.coneSectionVerticalOffset - dd.coneSectionRadius), '\n',
        "A", dd.coneSectionRadius, dd.coneSectionRadius, 0, 0, 0, di.x, -di.y, '\n',
        "Z", '\n',
    ].join(" ");
}

function diskAsSvg(diskDimensions) {
    const dd = diskDimensions;
    let svg = `<g transform="translate(${dd.hexCenter.x}, ${dd.hexCenter.y})">\n`;
    //svg = svg + `<circle stroke="red" cx="0" cy="-${dd.coneSectionVerticalOffset}" r="${dd.coneSectionRadius}"/>\n`;
    //svg = svg + `<circle stroke="green" cx="0" cy="0" r="${dd.diskRadius}"/>\n`;
    if(dd.intersection) {
        svg = svg + `<path d="${describeDisk(dd)}"/>\n`;
    } else if (!dd.coneSectionArc) {
        svg = svg + `<circle cx="0" cy="0" r="${dd.diskRadius}"/>\n`; 
    } else {
        let circles = `<circle cx="0" cy="0" r="${dd.diskRadius}"/>\n
                <circle cx="0" cy="${-dd.coneSectionVerticalOffset}" r="${dd.coneSectionRadius}"/>\n`;
        svg = svg + circles;
    }
    if(dd.diskDrillRadius > 0) {
        svg = svg + '\n' + `<circle cx="0" cy="0" r="${dd.diskDrillRadius}"/>\n`;
    }
    return svg + '\n' + '</g>';
}

export default function svg(parameters) {
    const p = parameters,
        dds = diskDimensions(p),
        xAxis = dds.map(disk => disk.hexCenter.x).reduce((a, b) => Math.max(a, b), 0) + p.sphereRadius + 1,
        yAxis = dds.map(disk => disk.hexCenter.y).reduce((a, b) => Math.max(a, b), 0) + p.sphereRadius + 1, 
        disks = dds.map(diskAsSvg);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${xAxis}" height="${yAxis}">
        <!-- ${JSON.stringify(p)} -->
        <g stroke="black" stroke-width="1" vector-effect="non-scaling-stroke" fill="none">
            ${disks.join('\n    ')}
        </g>
    </svg>`;
}