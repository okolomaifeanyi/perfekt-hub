"use client";

import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { useDebounce } from "use-debounce";
import { SyntheticEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2 } from "lucide-react"; 

const gf = new GiphyFetch("qBniB8kfrEg5eiT9jI1Fptu2fLAzz24q");

import { IGif } from "@giphy/js-types";

export default function GifPicker({
  onSelect,
  open,
  setOpen,
}: {
  onSelect:
    | ((gif: IGif, e: SyntheticEvent<HTMLElement, Event>) => void)
    | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
  }, [debouncedSearch]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" title="Add GIF" className="font-bold text-[#9933FF]">
          GIF
        </Button>
      </DialogTrigger>
      <DialogContent className="w-auto h-[80vh] overflow-y-auto">
        <DialogTitle>Pick GIF</DialogTitle>
        <div className="flex h-full justify-between flex-col">
          <div className="mb-2">
            <Input
              type="search"
              placeholder="Search GIFs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className=""
            />
          </div>

          {loading && (
            <div className="flex justify-center items-center py-4 flex-1">
              <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />
            </div>
          )}

          <Grid
            key={debouncedSearch}
            width={300}
            columns={2}
            gutter={6}
            fetchGifs={async offset => {
              const res = await gf.search(debouncedSearch || "funny", {
                offset,
                limit: 10,
              });
              setLoading(false);
              return res;
            }}
            onGifClick={onSelect}
            className="flex-1"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
