"""Minimal dependency-free PNG decoding.

Standard library only, so the asset tooling needs no install step and keeps
working years from now. Used by `measure.py` and `verify-crops.py`.

`readpng(path) -> (width, height, channels, pixels)` where `pixels` is a flat
bytes object of `channels` bytes per pixel, row-major.
"""
import zlib,struct,sys,json
def readpng(p):
    d=open(p,'rb').read()
    i=8; idat=b''; w=h=bd=ct=None
    while i<len(d):
        ln=struct.unpack('>I',d[i:i+4])[0]; typ=d[i+4:i+8]; data=d[i+8:i+8+ln]
        if typ==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',data[:10])
        elif typ==b'IDAT': idat+=data
        elif typ==b'IEND': break
        i+=12+ln
    raw=zlib.decompress(idat)
    nch={0:1,2:3,3:1,4:2,6:4}[ct]
    bpp=nch*(bd//8); stride=w*bpp
    out=bytearray(); prev=bytearray(stride); pos=0
    for y in range(h):
        f=raw[pos]; pos+=1
        line=bytearray(raw[pos:pos+stride]); pos+=stride
        if f==1:
            for x in range(bpp,stride): line[x]=(line[x]+line[x-bpp])&255
        elif f==2:
            for x in range(stride): line[x]=(line[x]+prev[x])&255
        elif f==3:
            for x in range(stride):
                a=line[x-bpp] if x>=bpp else 0
                line[x]=(line[x]+((a+prev[x])>>1))&255
        elif f==4:
            for x in range(stride):
                a=line[x-bpp] if x>=bpp else 0
                c=prev[x-bpp] if x>=bpp else 0
                b=prev[x]
                p=a+b-c; pa=abs(p-a); pb=abs(p-b); pc=abs(p-c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[x]=(line[x]+pr)&255
        out+=line; prev=line
    return w,h,nch,bytes(out)

def components(path, athresh=8, block=4, minblocks=12):
    w,h,nch,px=readpng(path)
    bw,bh=(w+block-1)//block,(h+block-1)//block
    occ=bytearray(bw*bh)
    for by in range(bh):
        for bx in range(bw):
            hit=0
            for y in range(by*block,min(by*block+block,h)):
                for x in range(bx*block,min(bx*block+block,w)):
                    if px[(y*w+x)*4+3]>athresh: hit=1;break
                if hit:break
            occ[by*bw+bx]=hit
    # union find on blocks (8-connectivity)
    par=list(range(bw*bh))
    def find(a):
        while par[a]!=a: par[a]=par[par[a]]; a=par[a]
        return a
    def uni(a,b):
        ra,rb=find(a),find(b)
        if ra!=rb: par[rb]=ra
    for by in range(bh):
        for bx in range(bw):
            if not occ[by*bw+bx]: continue
            i=by*bw+bx
            for dy,dx in ((0,-1),(-1,-1),(-1,0),(-1,1)):
                ny,nx=by+dy,bx+dx
                if 0<=ny<bh and 0<=nx<bw and occ[ny*bw+nx]: uni(i,ny*bw+nx)
    groups={}
    for by in range(bh):
        for bx in range(bw):
            if occ[by*bw+bx]:
                groups.setdefault(find(by*bw+bx),[]).append((bx,by))
    out=[]
    for g,cells in groups.items():
        if len(cells)<minblocks: continue
        xs=[c[0] for c in cells]; ys=[c[1] for c in cells]
        x0,x1=min(xs)*block, min(w,(max(xs)+1)*block)
        y0,y1=min(ys)*block, min(h,(max(ys)+1)*block)
        # refine to exact alpha bounds
        rx0,ry0,rx1,ry1=x1,y1,x0,y0
        tot=0; sx=0; sy=0
        for y in range(y0,y1):
            for x in range(x0,x1):
                a=px[(y*w+x)*4+3]
                if a>athresh:
                    if x<rx0:rx0=x
                    if x>rx1:rx1=x
                    if y<ry0:ry0=y
                    if y>ry1:ry1=y
                    tot+=a; sx+=x*a; sy+=y*a
        if tot==0: continue
        out.append(dict(x=rx0,y=ry0,w=rx1-rx0+1,h=ry1-ry0+1,area=len(cells)*block*block,cx=round(sx/tot,1),cy=round(sy/tot,1)))
    out.sort(key=lambda r:(r['y']//120, r['x']))
    return w,h,out

